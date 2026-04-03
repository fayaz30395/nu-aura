package com.hrms.infrastructure.kafka.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Base class for all Kafka events in the NU-AURA platform.
 *
 * <p>Ensures consistent event structure across all event types, supporting idempotent
 * processing via eventId and multi-tenant isolation via tenantId.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public abstract class BaseKafkaEvent implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Unique event identifier for idempotency and tracing.
     * Used to detect and skip duplicate processing.
     */
    @JsonProperty("event_id")
    private String eventId;

    /**
     * Event type identifier (e.g., "APPROVAL_APPROVED", "NOTIFICATION_SENT")
     */
    @JsonProperty("event_type")
    private String eventType;

    /**
     * Multi-tenant context: identifies which tenant this event belongs to.
     */
    @JsonProperty("tenant_id")
    private UUID tenantId;

    /**
     * When the event was produced (in UTC).
     */
    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    /**
     * Source system/service that produced this event.
     * Examples: "approval-service", "notification-service", "audit-service"
     */
    @JsonProperty("source")
    private String source;

    /**
     * Pre-populate defaults in constructor.
     */
    protected void initializeDefaults() {
        if (this.eventId == null) {
            this.eventId = UUID.randomUUID().toString();
        }
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }
}
