package com.hrms.common.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting configuration using Bucket4j.
 * Implements token bucket algorithm for API rate limiting.
 *
 * Playbook Reference: Prompt 14 - Security headers + rate limiting
 */
@Configuration
@Component
public class RateLimitConfig {

    @Value("${app.rate-limit.auth.capacity:10}")
    private int authCapacity;

    @Value("${app.rate-limit.auth.refill-tokens:10}")
    private int authRefillTokens;

    @Value("${app.rate-limit.auth.refill-minutes:1}")
    private int authRefillMinutes;

    @Value("${app.rate-limit.api.capacity:100}")
    private int apiCapacity;

    @Value("${app.rate-limit.api.refill-tokens:100}")
    private int apiRefillTokens;

    @Value("${app.rate-limit.api.refill-minutes:1}")
    private int apiRefillMinutes;

    @Value("${app.rate-limit.export.capacity:5}")
    private int exportCapacity;

    @Value("${app.rate-limit.export.refill-tokens:5}")
    private int exportRefillTokens;

    @Value("${app.rate-limit.export.refill-minutes:5}")
    private int exportRefillMinutes;

    // Cache buckets by IP or user+tenant
    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> apiBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> exportBuckets = new ConcurrentHashMap<>();

    /**
     * Get or create a rate limit bucket for authentication endpoints.
     * Stricter limits: 10 requests per minute per IP
     */
    public Bucket getAuthBucket(String key) {
        return authBuckets.computeIfAbsent(key, k -> createAuthBucket());
    }

    /**
     * Get or create a rate limit bucket for general API endpoints.
     * Standard limits: 100 requests per minute per user
     */
    public Bucket getApiBucket(String key) {
        return apiBuckets.computeIfAbsent(key, k -> createApiBucket());
    }

    /**
     * Get or create a rate limit bucket for export endpoints.
     * Strict limits: 5 requests per 5 minutes per user
     */
    public Bucket getExportBucket(String key) {
        return exportBuckets.computeIfAbsent(key, k -> createExportBucket());
    }

    private Bucket createAuthBucket() {
        Bandwidth limit = Bandwidth.classic(authCapacity,
            Refill.greedy(authRefillTokens, Duration.ofMinutes(authRefillMinutes)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createApiBucket() {
        Bandwidth limit = Bandwidth.classic(apiCapacity,
            Refill.greedy(apiRefillTokens, Duration.ofMinutes(apiRefillMinutes)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createExportBucket() {
        Bandwidth limit = Bandwidth.classic(exportCapacity,
            Refill.greedy(exportRefillTokens, Duration.ofMinutes(exportRefillMinutes)));
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * Check if request should be allowed for auth endpoints
     */
    public boolean tryConsumeAuth(String key) {
        return getAuthBucket(key).tryConsume(1);
    }

    /**
     * Check if request should be allowed for API endpoints
     */
    public boolean tryConsumeApi(String key) {
        return getApiBucket(key).tryConsume(1);
    }

    /**
     * Check if request should be allowed for export endpoints
     */
    public boolean tryConsumeExport(String key) {
        return getExportBucket(key).tryConsume(1);
    }

    /**
     * Get remaining tokens for auth bucket
     */
    public long getAuthRemainingTokens(String key) {
        return getAuthBucket(key).getAvailableTokens();
    }

    /**
     * Clean up expired buckets (call periodically via scheduled task)
     */
    public void cleanupBuckets() {
        // In production, implement LRU eviction or TTL-based cleanup
        if (authBuckets.size() > 10000) {
            authBuckets.clear();
        }
        if (apiBuckets.size() > 10000) {
            apiBuckets.clear();
        }
        if (exportBuckets.size() > 10000) {
            exportBuckets.clear();
        }
    }
}
