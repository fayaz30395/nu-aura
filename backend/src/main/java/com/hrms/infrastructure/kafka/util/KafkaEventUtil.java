package com.hrms.infrastructure.kafka.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.infrastructure.kafka.events.BaseKafkaEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Utility class for common Kafka event operations.
 *
 * <p>Provides helpers for:
 * - Event serialization/deserialization
 * - Event validation
 * - Tenant context extraction
 * - Idempotency key generation
 * </p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaEventUtil {

    private final ObjectMapper objectMapper;

    /**
     * Generate an idempotency key for an event.
     * Format: tenantId:eventId:timestamp
     *
     * @param tenantId Tenant identifier
     * @param eventId Event identifier
     * @return Composite idempotency key
     */
    public String generateIdempotencyKey(UUID tenantId, String eventId) {
        return String.format("%s:%s", tenantId, eventId);
    }

    /**
     * Validate that an event has required fields.
     *
     * @param event Event to validate
     * @return true if valid, false otherwise
     */
    public boolean validateEvent(BaseKafkaEvent event) {
        if (event == null) {
            log.warn("Event is null");
            return false;
        }

        if (event.getEventId() == null || event.getEventId().isEmpty()) {
            log.warn("Event missing eventId");
            return false;
        }

        if (event.getTenantId() == null) {
            log.warn("Event {} missing tenantId", event.getEventId());
            return false;
        }

        if (event.getEventType() == null || event.getEventType().isEmpty()) {
            log.warn("Event {} missing eventType", event.getEventId());
            return false;
        }

        if (event.getTimestamp() == null) {
            log.warn("Event {} missing timestamp", event.getEventId());
            return false;
        }

        return true;
    }

    /**
     * Serialize an event to JSON string.
     *
     * @param event Event to serialize
     * @return JSON string representation
     */
    public String toJson(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            log.error("Failed to serialize event: {}", e.getMessage(), e);
            throw new RuntimeException("Event serialization failed", e);
        }
    }

    /**
     * Deserialize JSON to an event object.
     *
     * @param json JSON string
     * @param eventClass Class to deserialize to
     * @param <T> Event type
     * @return Deserialized event
     */
    public <T> T fromJson(String json, Class<T> eventClass) {
        try {
            return objectMapper.readValue(json, eventClass);
        } catch (Exception e) {
            log.error("Failed to deserialize event: {}", e.getMessage(), e);
            throw new RuntimeException("Event deserialization failed", e);
        }
    }

    /**
     * Extract tenant ID from an event.
     *
     * @param event Event containing tenant context
     * @return Tenant ID
     */
    public UUID extractTenantId(BaseKafkaEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("Event cannot be null");
        }
        if (event.getTenantId() == null) {
            throw new IllegalArgumentException("Event missing tenantId");
        }
        return event.getTenantId();
    }

    /**
     * Create a detailed error context map for failed events.
     *
     * @param event The failed event
     * @param exception The exception that occurred
     * @return Map of error details
     */
    public Map<String, Object> createErrorContext(BaseKafkaEvent event, Exception exception) {
        Map<String, Object> context = new HashMap<>();

        context.put("eventId", event.getEventId());
        context.put("eventType", event.getEventType());
        context.put("tenantId", event.getTenantId());
        context.put("timestamp", event.getTimestamp());
        context.put("source", event.getSource());

        context.put("errorType", exception.getClass().getSimpleName());
        context.put("errorMessage", exception.getMessage());

        if (exception.getCause() != null) {
            context.put("rootCause", exception.getCause().getMessage());
        }

        return context;
    }

    /**
     * Check if an event is stale (older than threshold).
     *
     * @param event Event to check
     * @param thresholdMinutes Staleness threshold in minutes
     * @return true if event is older than threshold
     */
    public boolean isEventStale(BaseKafkaEvent event, int thresholdMinutes) {
        if (event.getTimestamp() == null) {
            return false;
        }

        long ageMinutes = java.time.temporal.ChronoUnit.MINUTES
                .between(event.getTimestamp(), java.time.LocalDateTime.now());
        return ageMinutes > thresholdMinutes;
    }

    /**
     * Generate a human-readable event summary for logging.
     *
     * @param event Event to summarize
     * @return Summary string
     */
    public String summarizeEvent(BaseKafkaEvent event) {
        return String.format(
                "[%s] %s - Tenant: %s, Time: %s",
                event.getEventId(),
                event.getEventType(),
                event.getTenantId(),
                event.getTimestamp()
        );
    }
}
