package com.nulogic.common.security;

import com.nulogic.common.config.CookieConfig;
import com.nulogic.common.config.DistributedRateLimiter;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiting filter using Redis-backed distributed rate limiting with in-memory fallback.
 *
 * <p>Each client (authenticated user, API-key holder, or anonymous IP) gets an
 * independent rate limit bucket shared across all application instances via Redis.
 *
 * <h3>Distributed Rate Limiting</h3>
 * <ol>
 *   <li><b>Primary:</b> Uses Redis via {@link DistributedRateLimiter} for consistent
 *       rate limiting across multiple instances (horizontal scaling).</li>
 *   <li><b>Fallback:</b> When Redis is unavailable, falls back to in-memory Bucket4j
 *       buckets (per-instance rate limiting).</li>
 * </ol>
 *
 * <h3>Memory safety</h3>
 * The fallback bucket map is guarded against unbounded growth by two mechanisms:
 * <ol>
 *   <li><b>Hard limit:</b> when the map reaches {@value #MAX_BUCKETS} entries a
 *       synchronised eviction sweep removes all buckets whose last-access timestamp
 *       is older than {@value #BUCKET_TTL_MINUTES} minutes.</li>
 *   <li><b>Scheduled sweep:</b> a fixed-rate background job runs every
 *       {@value #CLEANUP_INTERVAL_MS} ms and removes stale entries regardless of
 *       map size, preventing gradual accumulation from long-running deployments.</li>
 * </ol>
 */
@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    /**
     * Maximum number of live bucket entries before a forced eviction sweep is triggered.
     */
    private static final int MAX_BUCKETS = 50_000;

    /**
     * Minutes after last access before a bucket entry is considered stale.
     * Chosen to be 2× the token-refill period (1 minute) so a bucket is only
     * evicted after it has had ample time to refill.
     */
    private static final long BUCKET_TTL_MINUTES = 2L;

    /**
     * Background cleanup interval in milliseconds (every 5 minutes).
     */
    private static final long CLEANUP_INTERVAL_MS = 5 * 60 * 1_000L;
    private static final long REDIS_RETRY_INTERVAL_MS = 30_000; // 30 seconds
    /**
     * Fallback in-memory buckets used when Redis is unavailable
     */
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    /**
     * Parallel map tracking the last-access epoch-millisecond for each client key.
     * Kept in sync with {@link #buckets} — an entry is added/updated on every request
     * and removed when the corresponding bucket is evicted.
     */
    private final Map<String, Long> lastAccess = new ConcurrentHashMap<>();
    /**
     * Tracks whether we're using Redis (true) or fallback mode (false)
     */
    private final AtomicBoolean redisAvailable = new AtomicBoolean(true);
    @Autowired(required = false)
    private DistributedRateLimiter distributedRateLimiter;
    @Value("${app.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;
    @Value("${app.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;
    /**
     * Server-side secret used to derive a per-token bucket key via HMAC-SHA256.
     * Reuses the JWT signing secret so that the bucket key cannot be predicted by
     * an attacker who only sees the (unvalidated) JWT payload. The HMAC also means
     * a forged token with a chosen {@code sub} can no longer collide with a real
     * user's bucket — only signed-and-validated tokens reach the same bucket key.
     */
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    // ─────────────────────────────────────────────────────────────────────────
    // Filter logic
    // ─────────────────────────────────────────────────────────────────────────
    @Value("${app.rate-limit.use-redis:true}")
    private boolean useRedis;
    /**
     * Schedules a check to see if Redis is available again.
     * Simple implementation: check on next request after 30 seconds.
     */
    private volatile long lastRedisRetryTime = 0;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (!rateLimitEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip rate limiting for health checks and actuator endpoints
        String requestUri = request.getRequestURI();
        if (requestUri.equals("/") || requestUri.startsWith("/actuator") || requestUri.equals("/health")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientId = resolveClientId(request);
        DistributedRateLimiter.RateLimitType rateLimitType = determineRateLimitType(requestUri);

        // Try distributed (Redis) rate limiting first, fall back to in-memory
        RateLimitCheckResult result = checkRateLimit(clientId, rateLimitType);

        if (result.allowed()) {
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(result.remainingTokens()));
            response.addHeader("X-Rate-Limit-Mode", result.mode());
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for client: {} (mode: {})", clientId, result.mode());
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.addHeader("X-Rate-Limit-Remaining", "0");
            response.addHeader("X-Rate-Limit-Mode", result.mode());
            response.addHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
            response.getWriter().write(
                    "{\"error\":\"Rate limit exceeded\",\"message\":\"Too many requests. Please try again later.\"}");
        }
    }

    /**
     * Determines the rate limit type based on the request URI.
     */
    private DistributedRateLimiter.RateLimitType determineRateLimitType(String uri) {
        if (uri.startsWith("/api/v1/auth")) {
            return DistributedRateLimiter.RateLimitType.AUTH;
        }
        if (uri.contains("/export") || uri.contains("/report") || uri.contains("/download")) {
            return DistributedRateLimiter.RateLimitType.EXPORT;
        }
        if (uri.startsWith("/api/v1/wall") || uri.startsWith("/api/v1/social")) {
            return DistributedRateLimiter.RateLimitType.WALL;
        }
        if (uri.contains("/upload") || uri.contains("/import")) {
            return DistributedRateLimiter.RateLimitType.UPLOAD;
        }
        if (uri.startsWith("/api/v1/webhook")) {
            return DistributedRateLimiter.RateLimitType.WEBHOOK;
        }
        return DistributedRateLimiter.RateLimitType.API;
    }

    /**
     * Checks rate limit using Redis if available, otherwise falls back to in-memory.
     */
    private RateLimitCheckResult checkRateLimit(String clientId, DistributedRateLimiter.RateLimitType type) {
        // Try Redis-backed distributed rate limiting
        if (useRedis && distributedRateLimiter != null && redisAvailable.get()) {
            try {
                DistributedRateLimiter.RateLimitResult redisResult = distributedRateLimiter.tryAcquire(clientId, type);
                return new RateLimitCheckResult(
                        redisResult.allowed(),
                        redisResult.remainingTokens(),
                        redisResult.resetSeconds(),
                        "redis"
                );
            } catch (RuntimeException e) {
                // Redis failed - mark as unavailable and fall back
                log.warn("Redis rate limiting failed, falling back to in-memory: {}", e.getMessage());
                redisAvailable.set(false);
                // Schedule a retry to check if Redis is back
                scheduleRedisRetry();
            }
        }

        // Fallback to in-memory Bucket4j
        Bucket bucket = getOrCreateBucket(clientId);
        boolean allowed = bucket.tryConsume(1);
        long remaining = bucket.getAvailableTokens();

        return new RateLimitCheckResult(allowed, remaining, 60, "local");
    }

    private void scheduleRedisRetry() {
        long now = System.currentTimeMillis();
        if (now - lastRedisRetryTime > REDIS_RETRY_INTERVAL_MS) {
            lastRedisRetryTime = now;
            // Will retry on next request - simple approach without additional threads
        }
    }

    /**
     * Periodically check if Redis is back online.
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    @SchedulerLock(name = "checkRedisHealth", lockAtLeastFor = "PT15S", lockAtMostFor = "PT2M")
    public void checkRedisHealth() {
        if (!useRedis || distributedRateLimiter == null) {
            return;
        }
        if (!redisAvailable.get()) {
            try {
                // Try a simple operation to check if Redis is back
                distributedRateLimiter.getRemainingTokens("health-check", DistributedRateLimiter.RateLimitType.API);
                redisAvailable.set(true);
                log.info("Redis rate limiting recovered - switching back from local fallback");
            } catch (RuntimeException e) {
                log.debug("Redis still unavailable for rate limiting");
            }
        }
    }

    /**
     * Returns an existing bucket for the client or creates a new one.
     * Triggers a size-based eviction sweep if {@link #MAX_BUCKETS} is reached.
     */
    private Bucket getOrCreateBucket(String clientId) {
        // Update last-access time unconditionally on every request
        lastAccess.put(clientId, System.currentTimeMillis());

        return buckets.computeIfAbsent(clientId, id -> {
            // Evict stale entries if the map is approaching the hard limit
            if (buckets.size() >= MAX_BUCKETS) {
                log.warn("RateLimitingFilter bucket map reached {} entries — triggering eviction sweep", MAX_BUCKETS);
                evictStaleBuckets();
            }
            return createBucket(id);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bucket management (memory-safe)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Removes all bucket entries whose last-access time is older than {@link #BUCKET_TTL_MINUTES}.
     * Called both from the hard-limit path and from the scheduled cleanup job.
     */
    void evictStaleBuckets() {
        long cutoff = System.currentTimeMillis() - Duration.ofMinutes(BUCKET_TTL_MINUTES).toMillis();
        AtomicLong removed = new AtomicLong(0);

        lastAccess.entrySet().removeIf(entry -> {
            if (entry.getValue() < cutoff) {
                buckets.remove(entry.getKey());
                removed.incrementAndGet();
                return true;
            }
            return false;
        });

        if (removed.get() > 0) {
            log.debug("RateLimitingFilter evicted {} stale bucket entries; map size now {}",
                    removed.get(), buckets.size());
        }
    }

    /**
     * Scheduled cleanup job — removes stale entries every {@value #CLEANUP_INTERVAL_MS} ms
     * regardless of map size. This prevents gradual accumulation during long-running deployments.
     */
    @Scheduled(fixedRate = CLEANUP_INTERVAL_MS)
    @SchedulerLock(name = "rateLimitBucketCleanup", lockAtLeastFor = "PT2M", lockAtMostFor = "PT10M")
    public void scheduledCleanup() {
        evictStaleBuckets();
    }

    /**
     * Resolves a stable client identifier for rate-limit bucketing.
     *
     * <p><b>SEC-B01 hardening:</b> The previous implementation read the {@code sub}
     * claim from an unvalidated JWT payload, which let an attacker forge tokens with
     * arbitrary {@code sub} values to either evade their own bucket or pollute another
     * user's bucket (memory-exhaustion vector). We now derive the bucket key by
     * HMAC-SHA256-hashing the entire token with the server-side JWT secret. Because
     * only signed-and-valid tokens are produced by the auth service with a known
     * signature segment, the resulting key is stable across re-presentations of the
     * same token but cannot be forged from outside.</p>
     *
     * <p>Note: this means token rotation (refresh) produces a new bucket. That's an
     * acceptable trade-off — refresh is infrequent relative to the 60s window — and
     * the alternative (trusting unvalidated claims) is the actual vulnerability.</p>
     */
    private String resolveClientId(HttpServletRequest request) {
        // 1. Prefer authenticated user — derive bucket key from full JWT in Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String tokenKey = deriveTokenBucketKey(token);
            if (tokenKey != null) {
                return "user:" + tokenKey;
            }
            // Fallback if HMAC derivation fails — use IP so we don't create unbounded keys
            return "ip:" + getClientIp(request);
        }

        // 2. Fallback: derive bucket key from httpOnly access-token cookie (primary auth mechanism).
        // SEC (S11-I): Accept EITHER the hardened __Host-hrms-access cookie OR the legacy
        // access_token cookie. Hardened wins when both are present, mirroring
        // JwtAuthenticationFilter's precedence from S10-J.
        if (request.getCookies() != null) {
            String hardenedValue = null;
            String legacyValue = null;
            for (Cookie cookie : request.getCookies()) {
                String name = cookie.getName();
                if (CookieConfig.ACCESS_TOKEN_COOKIE_HOST.equals(name)) {
                    hardenedValue = cookie.getValue();
                } else if (CookieConfig.ACCESS_TOKEN_COOKIE.equals(name) && legacyValue == null) {
                    legacyValue = cookie.getValue();
                }
            }
            String cookieToken = hardenedValue != null ? hardenedValue : legacyValue;
            if (cookieToken != null) {
                try {
                    String tokenKey = deriveTokenBucketKey(cookieToken);
                    if (tokenKey != null) {
                        return "user:" + tokenKey;
                    }
                } catch (Exception e) {
                    log.debug("Failed to derive bucket key from access-token cookie", e);
                    // Fall through to API key / IP-based identification
                }
            }
        }

        // 3. API key (only first 8 chars — sufficient for identification, avoids leaking full key)
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null && !apiKey.isEmpty()) {
            return "apikey:" + apiKey.substring(0, Math.min(apiKey.length(), 8));
        }

        // Anonymous: fall back to the client IP
        return "ip:" + getClientIp(request);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Client identification & bucket creation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Derives a stable, unforgeable bucket key from a JWT by HMAC-SHA256-hashing the
     * full token with the server-side JWT secret. The first 16 hex chars (64 bits) are
     * enough to make collisions vanishingly unlikely while keeping log lines short.
     *
     * <p>Because the input includes the JWT's signature segment, only tokens signed
     * with the server secret can land in a given bucket — forged tokens with chosen
     * {@code sub} claims cannot collide with a real user's bucket.</p>
     *
     * @return the 16-char hex HMAC prefix, or {@code null} if HMAC computation fails
     */
    private String deriveTokenBucketKey(String token) {
        if (token == null || token.isEmpty() || jwtSecret == null || jwtSecret.isEmpty()) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 16);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            log.debug("Failed to derive HMAC bucket key for rate limiting", e);
            return null;
        }
    }

    private Bucket createBucket(String clientId) {
        int limit = requestsPerMinute;

        if (clientId.startsWith("user:")) {
            limit = requestsPerMinute * 2;       // Authenticated users: 2× limit
        } else if (clientId.startsWith("apikey:")) {
            limit = requestsPerMinute * 5;       // API keys: 5× limit
        }

        Bandwidth bandwidth = Bandwidth.classic(limit, Refill.intervally(limit, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(bandwidth).build();
    }

    /**
     * Returns the client IP address.
     *
     * <p><b>Security note (SEC-B01):</b> Do not parse X-Forwarded-For directly — the
     * header is fully attacker-controllable when the request bypasses our trusted
     * reverse proxy (and even when it doesn't, both leftmost and rightmost strategies
     * have foot-guns). Instead we rely on Spring's {@code ForwardedHeaderFilter} which
     * is enabled in production via {@code server.forward-headers-strategy: framework}
     * and rewrites {@code request.getRemoteAddr()} only when the immediate peer is a
     * configured trusted proxy.</p>
     */
    private String getClientIp(HttpServletRequest request) {
        // Trust resolved client IP from ForwardedHeaderFilter (configured via server.forward-headers-strategy=framework).
        return request.getRemoteAddr();
    }

    /**
     * Clears all rate-limit buckets. Intended for use in integration tests only.
     */
    public void clearBuckets() {
        buckets.clear();
        lastAccess.clear();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns the current number of active bucket entries (for monitoring/metrics).
     */
    public int getBucketCount() {
        return buckets.size();
    }

    /**
     * Result of a rate limit check
     */
    private record RateLimitCheckResult(boolean allowed, long remainingTokens, int retryAfterSeconds, String mode) {
    }
}
