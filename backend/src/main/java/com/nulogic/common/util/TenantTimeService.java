package com.nulogic.common.util;

import com.nulogic.domain.tenant.Tenant;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-tenant time resolver. Centralises every {@code LocalDate.now()} / {@code LocalDateTime.now()}
 * call so that attendance windows, payroll cutoffs, leave accrual, etc. respect the tenant's IANA
 * timezone instead of the server's JVM default.
 *
 * <p><strong>Why this exists.</strong> NU-AURA hosts tenants in IST today but the platform is
 * country-aware (V155 added the {@code country} column) and multi-region rollout is on the
 * roadmap. Any scheduled job that uses {@code LocalDate.now()} without a {@code ZoneId} will
 * silently drift the moment a tenant lives outside the server's zone. This service is the
 * single point of resolution; the Wave-10 audit P0-3 follow-up (S11-M) sweeps the codebase
 * to route every such call through here.</p>
 *
 * <p><strong>Caching.</strong> {@link ZoneId} resolution is cheap but the timezone string lives
 * on a hot row (tenants), so we cache the parsed {@code ZoneId} per tenant for an hour to avoid
 * a DB round-trip on every scheduled tick. Caffeine isn't on the backend classpath, so we use a
 * size-capped {@link ConcurrentHashMap} with manual TTL and a soft eviction sweep when the cap
 * is hit. 1 000 entries comfortably exceeds the realistic tenant count for a long while.</p>
 *
 * <p><strong>Fallback policy.</strong> A missing tenant logs at WARN and returns the default
 * zone; an unparseable zone-id logs at ERROR (because the DB check constraint should have
 * blocked it) and also returns the default. Scheduled jobs must never crash because of a
 * misconfigured tenant — the cost of a wrong-by-one-day report is lower than the cost of a
 * silent missed payroll cron.</p>
 */
@Component
@Slf4j
public class TenantTimeService {

    /**
     * Default zone used when the tenant is missing or its timezone string is unparseable.
     */
    static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Kolkata");

    /**
     * Max cached entries before we trigger a sweep. Keeps memory bounded under any load.
     */
    private static final int MAX_CACHE_SIZE = 1000;

    /**
     * Cached {@link ZoneId} entries expire after this many millis.
     */
    // R2 mitigation: 5min TTL caps cross-pod staleness pre-R1 (see backend/docs/audit/tenant-timezone-invalidate-review.md)
    private static final long CACHE_TTL_MILLIS = 5L * 60L * 1000L; // 5 minutes

    /**
     * Redis Pub/Sub channel name used to broadcast cache-invalidation events across pods.
     * R1 follow-up (see backend/docs/audit/tenant-timezone-invalidate-review.md): when an
     * admin updates a tenant's timezone, the pod that handled the write publishes the
     * tenantId here so every other pod evicts its local {@link CachedZone} entry before
     * the next zoneFor() lookup, avoiding the cross-pod staleness window described in R2.
     */
    public static final String INVALIDATE_CHANNEL = "tenant.timezone.invalidate";

    private final TenantRepository tenantRepository;
    private final Map<UUID, CachedZone> cache = new ConcurrentHashMap<>();

    /**
     * RedisTemplate used to publish invalidation events. Optional so that single-pod
     * deployments (e.g. the {@code render} profile, tests) where Redis pub/sub isn't
     * required can still construct this service. When {@code null}, {@link #invalidate}
     * degrades to a local-only eviction and emits no fan-out.
     */
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Primary constructor used by Spring. {@code redisTemplate} is autowired as required
     * in production (RedisConfig always exposes the bean) but the dual-argument form
     * keeps the optional contract explicit and lets tests use the legacy single-arg
     * constructor below.
     */
    @Autowired
    public TenantTimeService(TenantRepository tenantRepository,
                             RedisTemplate<String, Object> redisTemplate) {
        this.tenantRepository = tenantRepository;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Test-only convenience constructor. Production wiring uses the two-arg form so the
     * Redis fan-out is always available; unit tests that don't exercise pub/sub can use
     * this overload to skip the Redis mock setup.
     */
    public TenantTimeService(TenantRepository tenantRepository) {
        this(tenantRepository, null);
    }

    /**
     * Resolve the tenant's local date "now".
     *
     * @param tenantId tenant identifier; may be {@code null} in which case the default zone is used
     * @return today's date in the tenant's zone
     */
    public LocalDate today(UUID tenantId) {
        return LocalDate.now(zoneFor(tenantId));
    }

    /**
     * Resolve the tenant's local datetime "now".
     *
     * @param tenantId tenant identifier; may be {@code null} in which case the default zone is used
     * @return current local datetime in the tenant's zone
     */
    public LocalDateTime now(UUID tenantId) {
        return LocalDateTime.now(zoneFor(tenantId));
    }

    /**
     * Resolve and cache the {@link ZoneId} for a tenant. Falls back to {@link #DEFAULT_ZONE}
     * if the tenant is missing or its stored timezone string fails to parse.
     *
     * @param tenantId tenant identifier; {@code null} returns the default zone
     * @return the resolved zone, or {@link #DEFAULT_ZONE} on any failure
     */
    public ZoneId zoneFor(UUID tenantId) {
        if (tenantId == null) {
            return DEFAULT_ZONE;
        }

        CachedZone cached = cache.get(tenantId);
        long nowMillis = System.currentTimeMillis();
        if (cached != null && !cached.isExpired(nowMillis)) {
            return cached.zone;
        }

        ZoneId resolved = loadZoneFromDb(tenantId);
        if (cache.size() >= MAX_CACHE_SIZE) {
            evictExpiredOrOldest(nowMillis);
        }
        cache.put(tenantId, new CachedZone(resolved, nowMillis + CACHE_TTL_MILLIS));
        return resolved;
    }

    /**
     * Manually invalidate a single tenant's cached zone. Should be called by the tenant
     * settings flow when an admin changes the timezone so the new value takes effect
     * within the same JVM without waiting for the TTL.
     *
     * <p><strong>Cross-pod fan-out (R1).</strong> Evicts the local entry first, then
     * publishes the tenantId to the {@link #INVALIDATE_CHANNEL} Redis Pub/Sub channel so
     * every other pod evicts too. The subscriber on each pod calls {@link #invalidateLocal}
     * (not this method) to avoid an infinite republish loop.</p>
     *
     * <p>If the Redis publish fails the local eviction has already happened, so the same
     * JVM is in sync; remote pods will catch up on TTL expiry (capped at
     * {@link #CACHE_TTL_MILLIS}). The publish failure is logged at WARN, never thrown,
     * because the caller (a tenant-settings write) must not be reverted by a Redis blip.</p>
     *
     * @param tenantId tenant identifier; no-op if {@code null}
     */
    public void invalidate(UUID tenantId) {
        if (tenantId == null) {
            return;
        }
        invalidateLocal(tenantId);
        publishInvalidation(tenantId);
    }

    /**
     * Evict a single tenant's cached zone without publishing to Redis. Used by both the
     * pub/sub subscriber (so a received broadcast doesn't echo back) and {@link #invalidate}
     * (after which a publish is then issued exactly once).
     *
     * <p>This method is the loop-breaker for R1: the inbound subscriber path is
     * {@code Redis msg → invalidateLocal} (no republish), and the outbound write path is
     * {@code invalidate → invalidateLocal + publish}. Because the published payload never
     * re-enters via {@link #invalidate}, no fan-in cycle can form.</p>
     *
     * @param tenantId tenant identifier; no-op if {@code null} or absent from cache
     */
    public void invalidateLocal(UUID tenantId) {
        if (tenantId != null) {
            cache.remove(tenantId);
        }
    }

    private void publishInvalidation(UUID tenantId) {
        if (redisTemplate == null) {
            // No Redis wiring (test or single-pod profile): local eviction is sufficient.
            return;
        }
        try {
            // Payload is the raw UUID string; the subscriber parses it via UUID.fromString.
            // Keeping the wire format trivial avoids coupling the channel to a versioned DTO
            // and keeps log/redis-cli inspection self-evident.
            redisTemplate.convertAndSend(INVALIDATE_CHANNEL, tenantId.toString());
            log.debug("Published tenant timezone cache invalidation for {} to channel {}",
                    tenantId, INVALIDATE_CHANNEL);
        } catch (Exception e) { // Intentional broad catch — Redis pub/sub error boundary
            log.warn("Failed to publish tenant timezone invalidation for {} (channel {}); "
                            + "other pods will resync on TTL expiry ({} ms): {}",
                    tenantId, INVALIDATE_CHANNEL, CACHE_TTL_MILLIS, e.getMessage());
        }
    }

    private ZoneId loadZoneFromDb(UUID tenantId) {
        String tz = tenantRepository.findById(tenantId)
                .map(Tenant::getTimezone)
                .orElse(null);
        if (tz == null || tz.isBlank()) {
            log.warn("TenantTimeService: tenant {} not found or has blank timezone — falling back to {}",
                    tenantId, DEFAULT_ZONE);
            return DEFAULT_ZONE;
        }
        try {
            return ZoneId.of(tz);
        } catch (DateTimeException e) {
            // DateTimeException is the supertype of ZoneRulesException, so this catches both
            // an invalid shape ("not/a/zone") and a syntactically-valid-but-unknown zone-id
            // ("Mars/Olympus"). The DB CHECK constraint from V165 should already block these,
            // so reaching this branch means the constraint was bypassed or a zone was retired
            // from the tz database after backfill.
            log.error("TenantTimeService: tenant {} has unparseable timezone '{}' — falling back to {}. "
                            + "Check DB integrity, V165 regex should have blocked this.",
                    tenantId, tz, DEFAULT_ZONE, e);
            return DEFAULT_ZONE;
        }
    }

    /**
     * Sweep expired entries. If none are expired (worst case: every entry was just inserted),
     * remove a single arbitrary entry so the cap is never breached for long. This is a soft
     * cap — the goal is bounded memory, not perfect LRU semantics.
     */
    private void evictExpiredOrOldest(long nowMillis) {
        boolean evictedAny = cache.entrySet().removeIf(e -> e.getValue().isExpired(nowMillis));
        if (!evictedAny) {
            Iterator<UUID> it = cache.keySet().iterator();
            if (it.hasNext()) {
                it.next();
                it.remove();
            }
        }
    }

    /**
     * Holder for a cached {@link ZoneId} with its expiry timestamp (epoch millis).
     */
    private static final class CachedZone {
        final ZoneId zone;
        final long expiresAtMillis;

        CachedZone(ZoneId zone, long expiresAtMillis) {
            this.zone = zone;
            this.expiresAtMillis = expiresAtMillis;
        }

        boolean isExpired(long nowMillis) {
            return nowMillis >= expiresAtMillis;
        }
    }
}
