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
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter using Bucket4j.
 * Limits requests per IP address to prevent abuse.
 */
@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Value("${app.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    @Value("${app.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

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
        Bucket bucket = buckets.computeIfAbsent(clientId, this::createBucket);

        if (bucket.tryConsume(1)) {
            // Add rate limit headers
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for client: {}", clientId);
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.addHeader("X-Rate-Limit-Remaining", "0");
            response.addHeader("Retry-After", "60");
            response.getWriter().write("{\"error\":\"Rate limit exceeded\",\"message\":\"Too many requests. Please try again later.\"}");
        }
    }

    private String resolveClientId(HttpServletRequest request) {
        // Try to get authenticated user
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            // Use a hash of the token to identify the user
            return "user:" + authHeader.hashCode();
        }

        // Try API key
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null && !apiKey.isEmpty()) {
            return "apikey:" + apiKey.substring(0, Math.min(apiKey.length(), 8));
        }

        // Fall back to IP address
        return "ip:" + getClientIp(request);
    }

    private Bucket createBucket(String clientId) {
        // Different limits for different client types
        int limit = requestsPerMinute;

        if (clientId.startsWith("user:")) {
            limit = requestsPerMinute * 2; // Authenticated users get double the limit
        } else if (clientId.startsWith("apikey:")) {
            limit = requestsPerMinute * 5; // API keys get even higher limits
        }

        Bandwidth bandwidth = Bandwidth.classic(limit, Refill.intervally(limit, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Clear all rate limit buckets (useful for testing).
     */
    public void clearBuckets() {
        buckets.clear();
    }
}
