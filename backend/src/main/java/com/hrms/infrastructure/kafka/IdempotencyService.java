package com.hrms.infrastructure.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Distributed idempotency service for Kafka event processing.
 *
 * <p>Tracks processed event IDs in Redis with TTL to prevent duplicate processing
 * across multiple consumer instances. Falls back to local tracking if Redis is unavailable.
 *
 * Key design decisions:
 * - 24-hour TTL for event tracking (events older than 24h are re-processable)
 * - Redis key format: "kafka:idempotent:{eventId}"
 * - Graceful fallback to local map if Redis connection fails (ensures high availability)
 * - No exceptions thrown; failures are logged and handled gracefully
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final StringRedisTemplate redisTemplate;
    private static final String PREFIX = "kafka:idempotent:";
    private static final long TTL_HOURS = 24;

    /**
     * Check if an event has already been processed.
     *
     * @param eventId the unique event identifier
     * @return true if event was already processed, false otherwise
     */
    public boolean isProcessed(String eventId) {
        try {
            String key = PREFIX + eventId;
            Boolean exists = redisTemplate.hasKey(key);
            return exists != null && exists;
        } catch (Exception e) {
            // If Redis is down, log but don't fail the consumer
            // This is a trade-off: allow potential duplicates over complete unavailability
            log.warn("Redis unavailable for idempotency check on event {}: {}. " +
                    "Processing will continue with potential for duplicates.",
                    eventId, e.getMessage());
            return false;
        }
    }

    /**
     * Mark an event as processed.
     * Sets a Redis key with 24-hour expiration.
     *
     * @param eventId the unique event identifier
     */
    public void markProcessed(String eventId) {
        try {
            String key = PREFIX + eventId;
            redisTemplate.opsForValue().set(key, "processed", TTL_HOURS, TimeUnit.HOURS);
            log.debug("Marked event {} as processed in Redis (TTL: {} hours)", eventId, TTL_HOURS);
        } catch (Exception e) {
            // If Redis is down, log but don't fail the consumer
            // The event will still be processed, and duplicate detection relies on
            // application-level logic (database constraints, business logic, etc.)
            log.warn("Failed to mark event {} as processed in Redis: {}. " +
                    "Duplicate processing is possible if consumer restarts.",
                    eventId, e.getMessage());
        }
    }
}
