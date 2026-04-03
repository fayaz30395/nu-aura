package com.hrms.common.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

/**
 * Distributed rate limiter using Redis for multi-instance deployments.
 *
 * <p>Uses Redis atomic operations (INCR/EXPIRE) to implement a sliding window
 * rate limiter that works across multiple application instances.</p>
 *
 * <p><strong>SECURITY:</strong> Prevents distributed denial-of-service attacks
 * by enforcing rate limits consistently across all instances.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
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
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<Long> rateLimitScript = RedisScript.of(RATE_LIMIT_SCRIPT, Long.class);

    /**
     * Check if a request should be allowed based on rate limits.
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
                // Redis error - fail open (allow request but log warning)
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
            // Redis unavailable - fail open to prevent complete service outage
            log.error("Redis rate limit error for key: {}, failing open", key, e);
            return new RateLimitResult(true, type.getLimit(), type.getWindowSeconds());
        }
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
     * Rate limit configurations for different endpoint types.
     */
    public enum RateLimitType {
        AUTH("ratelimit:auth:", 10, 60),           // 10 requests per minute
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
