package com.hrms.common.security;

import com.hrms.common.config.CookieConfig;
import com.hrms.common.config.DistributedRateLimiter;
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

import java.io.IOException;
import java.time.Duration;
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
        if (requestUri.startsWith("/actuator") || requestUri.equals("/health")) {
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
     * <p>For authenticated users we extract the {@code sub} (subject / userId) claim
     * from the JWT payload instead of hashing the entire token.  This ensures that
     * the rate-limit bucket survives token refresh — the same user keeps the same
     * bucket across access-token rotations (SEC-B01 fix).
     */
    private String resolveClientId(HttpServletRequest request) {
        // 1. Prefer authenticated user — extract userId from JWT in Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String userId = extractSubjectFromJwt(authHeader.substring(7));
            if (userId != null) {
                return "user:" + userId;
            }
            // Fallback if JWT is malformed — use IP so we don't create unbounded keys
            return "ip:" + getClientIp(request);
        }

        // 2. Fallback: extract userId from httpOnly access_token cookie (primary auth mechanism)
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (CookieConfig.ACCESS_TOKEN_COOKIE.equals(cookie.getName())) {
                    try {
                        String userId = extractSubjectFromJwt(cookie.getValue());
                        if (userId != null) {
                            return "user:" + userId;
                        }
                    } catch (Exception e) {
                        log.debug("Failed to extract userId from access_token cookie for rate limiting", e);
                        // Fall through to API key / IP-based identification
                    }
                    break;
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
     * Extracts the {@code sub} claim from a JWT without full signature verification.
     * This is intentional — rate limiting doesn't need cryptographic proof, just a
     * stable identifier. Full auth is handled by the downstream security filter chain.
     *
     * @return the subject (userId) string, or {@code null} if extraction fails
     */
    private String extractSubjectFromJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
            // Minimal JSON parsing — extract "sub" field without pulling in a JSON library
            int subIdx = payload.indexOf("\"sub\"");
            if (subIdx < 0) return null;
            int colonIdx = payload.indexOf(':', subIdx);
            if (colonIdx < 0) return null;
            int startQuote = payload.indexOf('"', colonIdx);
            if (startQuote < 0) return null;
            int endQuote = payload.indexOf('"', startQuote + 1);
            if (endQuote < 0) return null;
            String sub = payload.substring(startQuote + 1, endQuote);
            return sub.isEmpty() ? null : sub;
        } catch (IllegalArgumentException e) {
            log.debug("Failed to extract subject from JWT for rate limiting", e);
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
     * <p><b>Security note (SEC-B01):</b> The X-Forwarded-For header can be spoofed by
     * the client for all positions <em>except</em> the rightmost entry, which is set by
     * the last trusted reverse proxy. We take {@code request.getRemoteAddr()} when no
     * proxy header is present, and the rightmost X-Forwarded-For entry otherwise.
     *
     * <p>If the application is behind a trusted load balancer (e.g. AWS ALB, GCP LB, nginx),
     * the rightmost IP is the one the LB actually connected from — the real client IP.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Take the rightmost IP — the one added by our trusted reverse proxy.
            // All entries to the left can be spoofed by the client.
            String[] ips = xForwardedFor.split(",");
            return ips[ips.length - 1].trim();
        }
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
