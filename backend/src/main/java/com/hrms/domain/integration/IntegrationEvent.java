package com.hrms.domain.integration;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Immutable record representing an event to be sent to integration connectors.
 *
 * <p>Triggered when domain events occur (e.g., employee created, leave approved).
 * Connectors subscribed to the event type will receive this event for processing.</p>
 */
public record IntegrationEvent(
        /**
         * The type of event (e.g., "employee.created", "leave.approved").
         */
        String eventType,

        /**
         * The tenant ID associated with this event.
         */
        UUID tenantId,

        /**
         * The UUID of the primary entity affected by this event.
         */
        UUID entityId,

        /**
         * The type of the entity (e.g., "Employee", "LeaveRequest").
         */
        String entityType,

        /**
         * Optional additional data about the event (e.g., old values, change details).
         */
        Map<String, Object> metadata,

        /**
         * Timestamp when the event occurred.
         */
        Instant timestamp
) {

    /**
     * Validates that required fields are non-null.
     */
    public IntegrationEvent {
        if (eventType == null || eventType.isBlank()) {
            throw new IllegalArgumentException("eventType cannot be null or empty");
        }
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId cannot be null");
        }
        if (entityId == null) {
            throw new IllegalArgumentException("entityId cannot be null");
        }
        if (entityType == null || entityType.isBlank()) {
            throw new IllegalArgumentException("entityType cannot be null or empty");
        }
        if (metadata == null) {
            throw new IllegalArgumentException("metadata cannot be null");
        }
        if (timestamp == null) {
            throw new IllegalArgumentException("timestamp cannot be null");
        }
    }

    /**
     * Factory method to create an integration event with current timestamp.
     */
    public static IntegrationEvent of(
            String eventType,
            UUID tenantId,
            UUID entityId,
            String entityType,
            Map<String, Object> metadata) {
        return new IntegrationEvent(eventType, tenantId, entityId, entityType, metadata, Instant.now());
    }
}
