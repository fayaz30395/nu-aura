package com.nulogic.common.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Distributed rate limiter using Redis for multi-instance deployments.
 *
 * <p>Uses Redis atomic operations (INCR/EXPIRE) to implement a sliding window
 * rate limiter that works across multiple application instances.</p>
 *
 * <p><strong>SECURITY:</strong> Prevents distributed denial-of-service attacks
 * by enforcing rate limits consistently across all instances.</p>
 *
 * <p><strong>Per-tenant scoping (S10-H):</strong> in addition to per-IP and
 * per-user scopes, {@link #tryConsumePerTenant(UUID, String, long)} provides
 * a per-tenant + per-resource bucket so one noisy tenant cannot exhaust the
 * global rate budget. Default capacity is 1000 req/min/resource/tenant; each
 * resource is independently tunable via
 * {@code app.ratelimit.tenant.<resource>.{capacity,refill}} (refill is in
 * tokens per minute).</p>
 */
@Slf4j
@Component
public class DistributedRateLimiter {

    // Lua script for atomic rate limiting (increment and check with TTL)
    private static final String RATE_LIMIT_SCRIPT = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])

            local current = redis.call('INCR', key)

            if current == 1 then
                redis.call('EXPIRE', key, window)
            end

            if current > limit then
                return 0
            end

            return limit - current
            """;

    /**
     * Lua script for atomic per-tenant rate limiting that supports multi-token
     * consumption. INCRBY by {@code tokens}; if the resulting counter exceeds
     * the limit, revert the increment and return -1 (rejected). Otherwise
     * return remaining tokens.
     */
    private static final String TENANT_RATE_LIMIT_SCRIPT = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local tokens = tonumber(ARGV[3])

            local current = redis.call('INCRBY', key, tokens)

            if current == tokens then
                redis.call('EXPIRE', key, window)
            end

            if current > limit then
                redis.call('DECRBY', key, tokens)
                return -1
            end

            return limit - current
            """;

    /**
     * Default per-tenant bucket: 1000 requests per minute per resource.
     * Overridable per resource via {@code app.ratelimit.tenant.<resource>.capacity}
     * and {@code app.ratelimit.tenant.<resource>.refill}.
     */
    private static final int DEFAULT_TENANT_CAPACITY = 1000;
    private static final int DEFAULT_TENANT_REFILL_TOKENS_PER_MINUTE = 1000;
    private static final int TENANT_WINDOW_SECONDS = 60;

    /**
     * Hard cap on the number of distinct (tenant,resource) fallback buckets
     * we keep in memory. Beyond this, a clear is forced as a defensive
     * eviction strategy.
     */
    private static final int MAX_FALLBACK_BUCKETS = 10_000;

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<Long> rateLimitScript = RedisScript.of(RATE_LIMIT_SCRIPT, Long.class);
    private final RedisScript<Long> tenantRateLimitScript =
            RedisScript.of(TENANT_RATE_LIMIT_SCRIPT, Long.class);
    /**
     * Bucket4j fallback for per-tenant rate limiting, keyed by
     * {@code tenantId:resource}. Used when Redis is unavailable.
     */
    private final Map<String, Bucket> tenantFallbackBuckets = new ConcurrentHashMap<>();
    /**
     * Spring {@link Environment} for resolving per-resource tunables at lookup
     * time. Marked {@code required = false} so unit tests can construct the
     * limiter without a full Spring context — when null we fall back to the
     * built-in defaults.
     */
    @Autowired(required = false)
    private Environment environment;

    public DistributedRateLimiter(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Build the canonical per-tenant rate-limit Redis key. Exposed for tests.
     */
    static String buildTenantKey(UUID tenantId, String resource) {
        return "rl:tenant:" + tenantId + ":" + resource;
    }

    /**
     * Check if a request should be allowed based on rate limits.
     *
     * <p><b>SEC fail policy:</b> On Redis errors we fail OPEN for non-auth buckets to
     * preserve availability of the broader API, but fail CLOSED for {@link RateLimitType#AUTH}
     * so brute-force/credential-stuffing protections cannot be bypassed by causing
     * Redis to error.</p>
     *
     * @param clientKey Unique identifier for the client (e.g., userId:tenantId or ip:address)
     * @param type      The type of rate limit to apply
     * @return RateLimitResult containing whether allowed and remaining tokens
     */
    public RateLimitResult tryAcquire(String clientKey, RateLimitType type) {
        String key = type.getPrefix() + clientKey;

        try {
            Long remaining = redisTemplate.execute(
                    rateLimitScript,
                    Collections.singletonList(key),
                    type.getLimit(),
                    type.getWindowSeconds()
            );

            if (remaining == null) {
                // Redis error - fail closed for AUTH, open elsewhere
                if (type == RateLimitType.AUTH) {
                    log.warn("Redis rate limit check failed for AUTH key: {}, failing CLOSED", key);
                    return new RateLimitResult(false, 0, type.getWindowSeconds());
                }
                log.warn("Redis rate limit check failed for key: {}, failing open", key);
                return new RateLimitResult(true, type.getLimit(), type.getWindowSeconds());
            }

            boolean allowed = remaining >= 0;
            long remainingTokens = Math.max(0, remaining);

            if (!allowed) {
                log.debug("Rate limit exceeded for key: {}, type: {}", key, type);
            }

            return new RateLimitResult(allowed, remainingTokens, type.getWindowSeconds());

        } catch (RuntimeException e) {
            // Redis unavailable - fail CLOSED for AUTH (brute-force protection),
            // fail open for other buckets to preserve broader API availability.
            if (type == RateLimitType.AUTH) {
                log.error("Redis rate limit error for AUTH key: {}, failing CLOSED", key, e);
                return new RateLimitResult(false, 0, type.getWindowSeconds());
            }
            log.error("Redis rate limit error for key: {}, failing open", key, e);
            return new RateLimitResult(true, type.getLimit(), type.getWindowSeconds());
        }
    }

    /**
     * Try to consume {@code tokens} from a per-tenant + per-resource bucket.
     *
     * <p>Key pattern: {@code rl:tenant:{tenantId}:{resource}} — e.g.
     * {@code rl:tenant:abc-123:export}.</p>
     *
     * <p>Default bucket: 1000 req/min per tenant per resource. Each resource is
     * tunable via {@code app.ratelimit.tenant.<resource>.capacity} and
     * {@code app.ratelimit.tenant.<resource>.refill} (refill is in tokens per
     * minute).</p>
     *
     * <p>If Redis is unavailable we fall back to an in-memory Bucket4j bucket
     * keyed by {@code tenantId:resource}, matching the same fallback pattern
     * used by {@link RateLimitingFilter} on the request hot path.</p>
     *
     * <p>On exhaustion this method emits a WARN-level audit log line including
     * the tenant id, resource, and remaining wait window so SRE can spot a
     * runaway tenant in log aggregation.</p>
     *
     * @param tenantId non-null tenant id; an IllegalArgumentException is thrown when null
     * @param resource non-blank resource bucket name (e.g. "export", "api", "webhook")
     * @param tokens   positive number of tokens to consume (typically 1)
     * @return result describing whether the consumption was allowed and tokens remaining
     */
    public RateLimitResult tryConsumePerTenant(UUID tenantId, String resource, long tokens) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId must not be null for per-tenant rate limiting");
        }
        if (resource == null || resource.isBlank()) {
            throw new IllegalArgumentException("resource must not be blank for per-tenant rate limiting");
        }
        if (tokens <= 0) {
            throw new IllegalArgumentException("tokens must be positive");
        }

        int capacity = resolveTenantCapacity(resource);
        int refillPerMinute = resolveTenantRefill(resource);
        String key = buildTenantKey(tenantId, resource);

        // ── Primary: Redis Lua, multi-token consume ──────────────────────────
        if (redisTemplate != null) {
            try {
                Long remaining = redisTemplate.execute(
                        tenantRateLimitScript,
                        Collections.singletonList(key),
                        capacity,
                        TENANT_WINDOW_SECONDS,
                        tokens
                );

                if (remaining != null) {
                    if (remaining < 0) {
                        log.warn(
                                "Tenant {} exhausted rate budget for {}; remaining wait {}s.",
                                tenantId, resource, TENANT_WINDOW_SECONDS
                        );
                        return new RateLimitResult(false, 0, TENANT_WINDOW_SECONDS);
                    }
                    return new RateLimitResult(true, remaining, TENANT_WINDOW_SECONDS);
                }
                // null remaining => Redis script returned no value; fall through to local fallback
                log.warn("Redis returned null for tenant rate limit key {}, falling back to local bucket", key);
            } catch (RuntimeException e) {
                log.warn(
                        "Redis tenant rate limit error for key {}; falling back to local Bucket4j: {}",
                        key, e.getMessage()
                );
                // fall through to local fallback below
            }
        }

        // ── Fallback: in-memory Bucket4j ─────────────────────────────────────
        Bucket bucket = getOrCreateTenantFallbackBucket(key, capacity, refillPerMinute);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(tokens);

        if (!probe.isConsumed()) {
            long waitSeconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
            log.warn(
                    "Tenant {} exhausted rate budget for {}; remaining wait {}s. (local fallback)",
                    tenantId, resource, Math.max(waitSeconds, 1)
            );
            return new RateLimitResult(false, 0, (int) Math.max(waitSeconds, 1));
        }

        return new RateLimitResult(true, probe.getRemainingTokens(), TENANT_WINDOW_SECONDS);
    }

    /**
     * Convenience overload for the common single-token case.
     */
    public RateLimitResult tryConsumePerTenant(UUID tenantId, String resource) {
        return tryConsumePerTenant(tenantId, resource, 1);
    }

    private int resolveTenantCapacity(String resource) {
        return resolveIntProperty(
                "app.ratelimit.tenant." + resource + ".capacity",
                DEFAULT_TENANT_CAPACITY
        );
    }

    private int resolveTenantRefill(String resource) {
        return resolveIntProperty(
                "app.ratelimit.tenant." + resource + ".refill",
                DEFAULT_TENANT_REFILL_TOKENS_PER_MINUTE
        );
    }

    private int resolveIntProperty(String key, int defaultValue) {
        if (environment == null) {
            return defaultValue;
        }
        try {
            Integer value = environment.getProperty(key, Integer.class);
            return value != null && value > 0 ? value : defaultValue;
        } catch (RuntimeException e) {
            log.debug("Unable to resolve property {}, using default {}", key, defaultValue);
            return defaultValue;
        }
    }

    private Bucket getOrCreateTenantFallbackBucket(String key, int capacity, int refillTokensPerMinute) {
        // Defensive bound on the local fallback map size — clear when we hit
        // the hard cap.
        if (tenantFallbackBuckets.size() > MAX_FALLBACK_BUCKETS) {
            log.warn(
                    "Per-tenant fallback bucket map exceeded {} entries; clearing.",
                    MAX_FALLBACK_BUCKETS
            );
            tenantFallbackBuckets.clear();
        }
        return tenantFallbackBuckets.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.classic(
                    capacity,
                    Refill.greedy(refillTokensPerMinute, Duration.ofMinutes(1))
            );
            return Bucket.builder().addLimit(limit).build();
        });
    }

    /**
     * Get remaining tokens for a client without consuming one.
     */
    public long getRemainingTokens(String clientKey, RateLimitType type) {
        String key = type.getPrefix() + clientKey;
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                return type.getLimit();
            }
            long current = Long.parseLong(value.toString());
            return Math.max(0, type.getLimit() - current);
        } catch (RuntimeException e) {
            log.debug("Error getting remaining tokens for key: {}", key, e);
            return type.getLimit();
        }
    }

    /**
     * Reset rate limit for a specific client (useful for testing or admin override).
     */
    public void resetLimit(String clientKey, RateLimitType type) {
        String key = type.getPrefix() + clientKey;
        try {
            redisTemplate.delete(key);
            log.info("Rate limit reset for key: {}", key);
        } catch (RuntimeException e) {
            log.error("Error resetting rate limit for key: {}", key, e);
        }
    }

    /**
     * Reset rate limit for a specific tenant+resource pair. Removes both the
     * Redis-backed counter (when available) and the in-memory fallback bucket.
     */
    public void resetTenantLimit(UUID tenantId, String resource) {
        if (tenantId == null || resource == null || resource.isBlank()) {
            return;
        }
        String key = buildTenantKey(tenantId, resource);
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(key);
            }
        } catch (RuntimeException e) {
            log.debug("Error resetting tenant rate limit in Redis for key {}", key, e);
        }
        tenantFallbackBuckets.remove(key);
    }

    /**
     * Block a client completely (for abuse prevention).
     */
    public void blockClient(String clientKey, RateLimitType type, long durationMinutes) {
        String key = type.getPrefix() + clientKey;
        try {
            // Set counter way above limit with long TTL
            redisTemplate.opsForValue().set(key, type.getLimit() * 1000, durationMinutes, TimeUnit.MINUTES);
            log.warn("Client blocked for {} minutes: {}", durationMinutes, key);
        } catch (RuntimeException e) {
            log.error("Error blocking client: {}", key, e);
        }
    }

    /**
     * Test seam — allows tests to install a stubbed Environment without
     * pulling in a full Spring context.
     */
    void setEnvironmentForTesting(Environment env) {
        this.environment = env;
    }

    /**
     * Rate limit configurations for different endpoint types.
     */
    public enum RateLimitType {
        AUTH("ratelimit:auth:", 5, 60),            // 5 requests per minute (docs: 5/min auth)
        API("ratelimit:api:", 100, 60),            // 100 requests per minute
        EXPORT("ratelimit:export:", 5, 300),       // 5 requests per 5 minutes
        WALL("ratelimit:wall:", 30, 60),           // 30 requests per minute
        UPLOAD("ratelimit:upload:", 20, 60),       // 20 uploads per minute
        WEBHOOK("ratelimit:webhook:", 50, 60);     // 50 webhook operations per minute

        private final String prefix;
        private final int limit;
        private final int windowSeconds;

        RateLimitType(String prefix, int limit, int windowSeconds) {
            this.prefix = prefix;
            this.limit = limit;
            this.windowSeconds = windowSeconds;
        }

        public String getPrefix() {
            return prefix;
        }

        public int getLimit() {
            return limit;
        }

        public int getWindowSeconds() {
            return windowSeconds;
        }
    }

    /**
     * Result of a rate limit check.
     */
    public record RateLimitResult(
            boolean allowed,
            long remainingTokens,
            int resetSeconds
    ) {
    }
}
