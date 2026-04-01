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
 * across multiple consumer instances. Uses atomic SETNX to eliminate the race
 * condition between check and mark operations.
 *
 * Key design decisions:
 * - 24-hour TTL for event tracking (events older than 24h are re-processable)
 * - Redis key format: "kafka:idempotent:{eventId}"
 * - Atomic SETNX ensures exactly-once semantics even under concurrent access
 * - Graceful fallback if Redis is unavailable (logs warning, allows processing)
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
     * Atomically attempt to claim an event for processing.
     *
     * <p>Uses Redis SETNX (SET IF NOT EXISTS) with TTL to atomically check and mark
     * the event in a single operation. This eliminates the race condition that existed
     * in the previous separate {@code isProcessed()} + {@code markProcessed()} pattern,
     * where two consumers could both see "not processed" and proceed simultaneously.</p>
     *
     * @param eventId the unique event identifier
     * @return true if this caller is the first to claim the event (proceed with processing);
     *         false if another consumer already claimed it (skip processing)
     */
    public boolean tryProcess(String eventId) {
        try {
            String key = PREFIX + eventId;
            Boolean result = redisTemplate.opsForValue().setIfAbsent(
                    key, "processed", TTL_HOURS, TimeUnit.HOURS);
            boolean firstClaimer = Boolean.TRUE.equals(result);
            if (firstClaimer) {
                log.debug("Claimed event {} for processing (TTL: {} hours)", eventId, TTL_HOURS);
            } else {
                log.debug("Event {} already claimed by another consumer, skipping", eventId);
            }
            return firstClaimer;
        } catch (RuntimeException e) {
            // If Redis is down, log but don't fail the consumer.
            // This is a trade-off: allow potential duplicates over complete unavailability.
            // Application-level idempotency (DB constraints, business logic) provides a safety net.
            log.warn("Redis unavailable for idempotency check on event {}: {}. " +
                    "Processing will continue with potential for duplicates.",
                    eventId, e.getMessage());
            return true; // Allow processing when Redis is down
        }
    }

    /**
     * Check if an event has already been processed.
     *
     * @param eventId the unique event identifier
     * @return true if event was already processed, false otherwise
     * @deprecated Use {@link #tryProcess(String)} instead for atomic check-and-set.
     *             This method is retained only for backward compatibility during migration.
     */
    @Deprecated(forRemoval = true)
    public boolean isProcessed(String eventId) {
        try {
            String key = PREFIX + eventId;
            Boolean exists = redisTemplate.hasKey(key);
            return exists != null && exists;
        } catch (RuntimeException e) {
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
     * @deprecated Use {@link #tryProcess(String)} instead for atomic check-and-set.
     *             This method is retained only for backward compatibility during migration.
     */
    @Deprecated(forRemoval = true)
    public void markProcessed(String eventId) {
        try {
            String key = PREFIX + eventId;
            redisTemplate.opsForValue().set(key, "processed", TTL_HOURS, TimeUnit.HOURS);
            log.debug("Marked event {} as processed in Redis (TTL: {} hours)", eventId, TTL_HOURS);
        } catch (RuntimeException e) {
            log.warn("Failed to mark event {} as processed in Redis: {}. " +
                    "Duplicate processing is possible if consumer restarts.",
                    eventId, e.getMessage());
        }
    }
}
