package com.hrms.common.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting configuration using Bucket4j.
 * Implements token bucket algorithm for API rate limiting.
 * <p>
 * Playbook Reference: Prompt 14 - Security headers + rate limiting
 */
@Slf4j
@Configuration
@Component
public class RateLimitConfig {

    /**
     * Maximum number of bucket entries per type before a forced eviction is triggered.
     */
    private static final int MAX_BUCKET_ENTRIES = 10_000;
    // Cache buckets by IP or user+tenant
    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> apiBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> exportBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> wallBuckets = new ConcurrentHashMap<>();
    @Value("${app.rate-limit.auth.capacity:5}")
    private int authCapacity;
    @Value("${app.rate-limit.auth.refill-tokens:5}")
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
    @Value("${app.rate-limit.wall.capacity:30}")
    private int wallCapacity;
    @Value("${app.rate-limit.wall.refill-tokens:30}")
    private int wallRefillTokens;
    @Value("${app.rate-limit.wall.refill-minutes:1}")
    private int wallRefillMinutes;

    /**
     * Get or create a rate limit bucket for authentication endpoints.
     * Stricter limits: 5 requests per minute per IP
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

    /**
     * Get or create a rate limit bucket for wall endpoints.
     * Moderate limits: 30 requests per minute per user
     */
    public Bucket getWallBucket(String key) {
        return wallBuckets.computeIfAbsent(key, k -> createWallBucket());
    }

    private Bucket createAuthBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(authCapacity)
                .refillGreedy(authRefillTokens, Duration.ofMinutes(authRefillMinutes))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createApiBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(apiCapacity)
                .refillGreedy(apiRefillTokens, Duration.ofMinutes(apiRefillMinutes))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createExportBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(exportCapacity)
                .refillGreedy(exportRefillTokens, Duration.ofMinutes(exportRefillMinutes))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createWallBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(wallCapacity)
                .refillGreedy(wallRefillTokens, Duration.ofMinutes(wallRefillMinutes))
                .build();
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
     * Check if request should be allowed for wall endpoints
     */
    public boolean tryConsumeWall(String key) {
        return getWallBucket(key).tryConsume(1);
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
        // Evict all entries when any bucket map exceeds the hard limit
        if (authBuckets.size() > MAX_BUCKET_ENTRIES) {
            authBuckets.clear();
        }
        if (apiBuckets.size() > MAX_BUCKET_ENTRIES) {
            apiBuckets.clear();
        }
        if (exportBuckets.size() > MAX_BUCKET_ENTRIES) {
            exportBuckets.clear();
        }
        if (wallBuckets.size() > MAX_BUCKET_ENTRIES) {
            wallBuckets.clear();
        }
    }
}
