package com.hrms.common.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiting filter using Bucket4j token buckets.
 *
 * <p>Each client (authenticated user, API-key holder, or anonymous IP) gets an
 * independent {@link Bucket} capped to a configurable number of requests per minute.
 *
 * <h3>Memory safety</h3>
 * The internal bucket map is guarded against unbounded growth by two mechanisms:
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

    /** Maximum number of live bucket entries before a forced eviction sweep is triggered. */
    private static final int MAX_BUCKETS = 50_000;

    /**
     * Minutes after last access before a bucket entry is considered stale.
     * Chosen to be 2× the token-refill period (1 minute) so a bucket is only
     * evicted after it has had ample time to refill.
     */
    private static final long BUCKET_TTL_MINUTES = 2L;

    /** Background cleanup interval in milliseconds (every 5 minutes). */
    private static final long CLEANUP_INTERVAL_MS = 5 * 60 * 1_000L;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Parallel map tracking the last-access epoch-millisecond for each client key.
     * Kept in sync with {@link #buckets} — an entry is added/updated on every request
     * and removed when the corresponding bucket is evicted.
     */
    private final Map<String, Long> lastAccess = new ConcurrentHashMap<>();

    @Value("${app.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    @Value("${app.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    // ─────────────────────────────────────────────────────────────────────────
    // Filter logic
    // ─────────────────────────────────────────────────────────────────────────

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
        Bucket bucket = getOrCreateBucket(clientId);

        if (bucket.tryConsume(1)) {
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for client: {}", clientId);
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.addHeader("X-Rate-Limit-Remaining", "0");
            response.addHeader("Retry-After", "60");
            response.getWriter().write(
                    "{\"error\":\"Rate limit exceeded\",\"message\":\"Too many requests. Please try again later.\"}");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bucket management (memory-safe)
    // ─────────────────────────────────────────────────────────────────────────

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
    public void scheduledCleanup() {
        evictStaleBuckets();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Client identification & bucket creation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves a stable client identifier for rate-limit bucketing.
     *
     * <p>For authenticated users we extract the {@code sub} (subject / userId) claim
     * from the JWT payload instead of hashing the entire token.  This ensures that
     * the rate-limit bucket survives token refresh — the same user keeps the same
     * bucket across access-token rotations (SEC-B01 fix).
     */
    private String resolveClientId(HttpServletRequest request) {
        // Prefer authenticated user — extract userId from JWT subject claim
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String userId = extractSubjectFromJwt(authHeader.substring(7));
            if (userId != null) {
                return "user:" + userId;
            }
            // Fallback if JWT is malformed — use IP so we don't create unbounded keys
            return "ip:" + getClientIp(request);
        }

        // API key (only first 8 chars — sufficient for identification, avoids leaking full key)
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null && !apiKey.isEmpty()) {
            return "apikey:" + apiKey.substring(0, Math.min(apiKey.length(), 8));
        }

        // Anonymous: fall back to the client IP
        return "ip:" + getClientIp(request);
    }

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
        } catch (Exception e) {
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

    // ─────────────────────────────────────────────────────────────────────────
    // Test helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Clears all rate-limit buckets. Intended for use in integration tests only. */
    public void clearBuckets() {
        buckets.clear();
        lastAccess.clear();
    }

    /** Returns the current number of active bucket entries (for monitoring/metrics). */
    public int getBucketCount() {
        return buckets.size();
    }
}
