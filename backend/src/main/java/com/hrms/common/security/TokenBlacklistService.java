package com.hrms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing JWT token revocation.
 * Uses Redis for distributed blacklist with TTL matching token expiration.
 * Falls back to in-memory cache if Redis is unavailable.
 *
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

    private boolean redisAvailable = true;

    @Autowired
    public TokenBlacklistService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        testRedisConnection();
    }

    private void testRedisConnection() {
        try {
            redisTemplate.opsForValue().get("test");
            redisAvailable = true;
            log.info("Token blacklist service initialized with Redis backend");
        } catch (Exception e) {
            redisAvailable = false;
            log.warn("Redis unavailable for token blacklist, using in-memory fallback. " +
                    "This is acceptable for single-instance deployments but not recommended for production clusters.");
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
            } catch (Exception e) {
                log.error("Failed to blacklist token in Redis, falling back to in-memory", e);
                blacklistInMemory(jti, expiration.getTime());
            }
        } else {
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
            } catch (Exception e) {
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
    public void revokeAllTokensBefore(String userId, Instant timestamp) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        String key = "user:token:revoked_before:" + userId;
        // Store with TTL of max refresh token lifetime (24 hours default)
        Duration ttl = Duration.ofHours(24);

        if (redisAvailable) {
            try {
                redisTemplate.opsForValue().set(key, String.valueOf(timestamp.toEpochMilli()), ttl);
                log.info("All tokens for user {} issued before {} are now revoked", userId, timestamp);
            } catch (Exception e) {
                log.error("Failed to set user token revocation time in Redis", e);
            }
        }
    }

    /**
     * Check if a token was issued before the user's revocation timestamp.
     *
     * @param userId   The user ID
     * @param issuedAt When the token was issued
     * @return true if the token was issued before the revocation time
     */
    public boolean isTokenRevokedByTimestamp(String userId, Date issuedAt) {
        if (userId == null || issuedAt == null || !redisAvailable) {
            return false;
        }

        try {
            String key = "user:token:revoked_before:" + userId;
            String revokedBeforeStr = redisTemplate.opsForValue().get(key);
            if (revokedBeforeStr != null) {
                long revokedBefore = Long.parseLong(revokedBeforeStr);
                return issuedAt.getTime() < revokedBefore;
            }
        } catch (Exception e) {
            log.error("Failed to check user token revocation in Redis", e);
        }
        return false;
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
