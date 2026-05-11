package com.hrms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing JWT token revocation.
 * Uses Redis for distributed blacklist with TTL matching token expiration.
 * Falls back to in-memory cache if Redis is unavailable.
 * <p>
 * Token revocation is critical for:
 * - Logout functionality (invalidate tokens before natural expiry)
 * - Password changes (invalidate all existing tokens)
 * - Account compromise (emergency token revocation)
 */
@Service
@Slf4j
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "token:blacklist:";

    private final StringRedisTemplate redisTemplate;

    // Fallback in-memory blacklist (used when Redis unavailable)
    private final ConcurrentHashMap<String, Long> inMemoryBlacklist = new ConcurrentHashMap<>();

    /**
     * Per-user revoked-before timestamp (epoch-ms) used when Redis is unavailable.
     * Mirrors the Redis key {@code user:token:revoked_before:<userId>} so logout/
     * password-change revocation survives Redis outages on a single-pod fallback.
     */
    private static final ConcurrentHashMap<String, Long> revokedBeforeFallback = new ConcurrentHashMap<>();

    /**
     * Refresh token expiration in milliseconds — used as the TTL for the
     * "revoked before" timestamp record.
     */
    @Value("${app.jwt.refresh-expiration:86400000}")
    private long refreshExpirationMs;

    /**
     * Whether Redis is currently reachable. Updated at construction and
     * by {@link #redisHealthProbe()} every 30 s. Reads / writes are racy
     * (intentional — single boolean, no consistency requirement) but ordering
     * within a single request is not relied upon: each public method re-reads
     * the field at most once.
     */
    private volatile boolean redisAvailable = true;

    /**
     * Latched so we only log the multi-pod logout-bypass warning once per outage
     * (cleared on Redis recovery). Avoids log flooding when Redis is sustained-down.
     */
    private final AtomicBoolean fallbackWarningEmitted = new AtomicBoolean(false);

    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        testRedisConnection();
    }

    private void testRedisConnection() {
        try {
            redisTemplate.opsForValue().get("test");
            redisAvailable = true;
            log.info("Token blacklist service initialized with Redis backend");
        } catch (RuntimeException e) {
            redisAvailable = false;
            log.warn("Redis unavailable for token blacklist, using in-memory fallback. " +
                    "This is acceptable for single-instance deployments but not recommended for production clusters.");
        }
    }

    /**
     * Re-probe Redis every 30 seconds and flip {@link #redisAvailable} on state
     * transitions. Without this, an outage at startup would leave the service
     * permanently stuck on the per-pod in-memory fallback even after Redis
     * recovers — which silently breaks multi-pod logout correctness.
     *
     * <p>Only logs on transitions to avoid log flooding.</p>
     */
    @Scheduled(fixedDelay = 30_000)
    public void redisHealthProbe() {
        boolean previous = redisAvailable;
        try {
            // Use a lightweight read (matches what we'd do in the hot path) instead
            // of PING so connection-pool / serializer / auth issues also surface.
            redisTemplate.opsForValue().get("__health_probe__");
            if (!previous) {
                log.info("Token blacklist: Redis recovered — switching back to Redis-backed blacklist");
                fallbackWarningEmitted.set(false);
            }
            redisAvailable = true;
        } catch (RuntimeException e) {
            if (previous) {
                log.warn("Token blacklist: Redis became unreachable — falling back to in-memory blacklist. " +
                        "Cross-pod logout will be best-effort until Redis returns. Cause: {}", e.getMessage());
            }
            redisAvailable = false;
        }
    }

    /**
     * Log a single warning the first time the per-pod fallback is hit during the
     * current outage. Auto-resets when {@link #redisHealthProbe()} observes Redis
     * recovery, so each fresh outage produces exactly one log line.
     */
    private void warnFallbackUsedOnce() {
        if (fallbackWarningEmitted.compareAndSet(false, true)) {
            log.warn("Token blacklisted in per-pod fallback only — " +
                    "multi-pod logout-bypass window during Redis outage");
        }
    }

    /**
     * Add a token to the blacklist.
     *
     * @param jti        The unique token identifier (JWT ID claim)
     * @param expiration The token's expiration time
     */
    public void blacklistToken(String jti, Date expiration) {
        if (jti == null || jti.isBlank()) {
            log.warn("Cannot blacklist token with null or empty JTI");
            return;
        }

        // Calculate TTL (time until token would naturally expire)
        long ttlMillis = expiration.getTime() - System.currentTimeMillis();
        if (ttlMillis <= 0) {
            // Token already expired, no need to blacklist
            log.debug("Token {} already expired, skipping blacklist", jti);
            return;
        }

        Duration ttl = Duration.ofMillis(ttlMillis);

        if (redisAvailable) {
            try {
                String key = BLACKLIST_PREFIX + jti;
                redisTemplate.opsForValue().set(key, "revoked", ttl);
                log.debug("Token {} blacklisted in Redis with TTL {} seconds", jti, ttl.getSeconds());
            } catch (RuntimeException e) {
                log.error("Failed to blacklist token in Redis, falling back to in-memory", e);
                warnFallbackUsedOnce();
                blacklistInMemory(jti, expiration.getTime());
            }
        } else {
            warnFallbackUsedOnce();
            blacklistInMemory(jti, expiration.getTime());
        }
    }

    /**
     * Check if a token is blacklisted.
     *
     * @param jti The unique token identifier (JWT ID claim)
     * @return true if the token is blacklisted/revoked
     */
    public boolean isBlacklisted(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }

        if (redisAvailable) {
            try {
                String key = BLACKLIST_PREFIX + jti;
                Boolean exists = redisTemplate.hasKey(key);
                return Boolean.TRUE.equals(exists);
            } catch (RuntimeException e) {
                log.error("Failed to check blacklist in Redis, falling back to in-memory", e);
                return isBlacklistedInMemory(jti);
            }
        } else {
            return isBlacklistedInMemory(jti);
        }
    }

    /**
     * Blacklist all tokens issued before a specific time for a user.
     * This is useful for "logout everywhere" or password change scenarios.
     *
     * @param userId    The user ID
     * @param timestamp All tokens issued before this time are considered revoked
     */
    @Transactional
    public void revokeAllTokensBefore(String userId, Instant timestamp) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        String key = "user:token:revoked_before:" + userId;
        // TTL matches the longest-lived token (refresh) so the marker outlives any
        // already-issued token. Configurable via app.jwt.refresh-expiration.
        Duration ttl = Duration.ofMillis(refreshExpirationMs);
        long epochMs = timestamp.toEpochMilli();

        if (redisAvailable) {
            try {
                redisTemplate.opsForValue().set(key, String.valueOf(epochMs), ttl);
                log.info("All tokens for user {} issued before {} are now revoked", userId, timestamp);
                return;
            } catch (RuntimeException e) {
                log.error("Failed to set user token revocation time in Redis — falling back to in-memory", e);
            }
        }
        // Redis-down fallback: keep the marker locally so this pod still enforces revocation.
        warnFallbackUsedOnce();
        revokedBeforeFallback.merge(userId, epochMs, Math::max);
    }

    /**
     * Check if a token was issued before the user's revocation timestamp.
     *
     * @param userId   The user ID
     * @param issuedAt When the token was issued
     * @return true if the token was issued before the revocation time
     */
    public boolean isTokenRevokedByTimestamp(String userId, Date issuedAt) {
        if (userId == null || issuedAt == null) {
            return false;
        }

        if (redisAvailable) {
            try {
                String key = "user:token:revoked_before:" + userId;
                String revokedBeforeStr = redisTemplate.opsForValue().get(key);
                if (revokedBeforeStr != null) {
                    long revokedBefore = Long.parseLong(revokedBeforeStr);
                    return issuedAt.getTime() < revokedBefore;
                }
            } catch (RuntimeException e) {
                log.error("Failed to check user token revocation in Redis — falling back to in-memory", e);
            }
        }
        // Redis-down fallback path
        Long fallbackRevokedBefore = revokedBeforeFallback.get(userId);
        return fallbackRevokedBefore != null && issuedAt.getTime() < fallbackRevokedBefore;
    }

    // In-memory fallback methods

    private void blacklistInMemory(String jti, long expirationTime) {
        inMemoryBlacklist.put(jti, expirationTime);
        log.debug("Token {} blacklisted in-memory until {}", jti, expirationTime);

        // Clean up expired entries periodically
        cleanupInMemoryBlacklist();
    }

    private boolean isBlacklistedInMemory(String jti) {
        Long expiration = inMemoryBlacklist.get(jti);
        if (expiration != null) {
            if (System.currentTimeMillis() > expiration) {
                // Entry expired, remove it
                inMemoryBlacklist.remove(jti);
                return false;
            }
            return true;
        }
        return false;
    }

    private void cleanupInMemoryBlacklist() {
        long now = System.currentTimeMillis();
        inMemoryBlacklist.entrySet().removeIf(entry -> entry.getValue() < now);
    }
}
