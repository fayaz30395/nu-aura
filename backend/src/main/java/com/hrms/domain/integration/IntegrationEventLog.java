package com.hrms.domain.integration;

import lombok.extern.slf4j.Slf4j;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * JPA entity representing a log entry for an integration event.
 *
 * <p>Records successful, failed, and skipped event processing for audit
 * and debugging purposes. Each entry captures event metadata, processing
 * duration, and error details if applicable.</p>
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "integration_event_log", indexes = {
    @Index(name = "idx_event_log_tenant_connector", columnList = "tenant_id, connector_id"),
    @Index(name = "idx_event_log_tenant_status", columnList = "tenant_id, status"),
    @Index(name = "idx_event_log_created_at", columnList = "created_at")
})
@Slf4j
public class IntegrationEventLog extends TenantAware {

    /**
     * The ID of the connector that processed (or attempted to process) the event.
     */
    @Column(nullable = false)
    private String connectorId;

    /**
     * The type of event that was processed (e.g., "employee.created", "leave.approved").
     */
    @Column(nullable = false)
    private String eventType;

    /**
     * The type of the entity affected by the event (e.g., "Employee", "LeaveRequest").
     */
    @Column(nullable = false)
    private String entityType;

    /**
     * The UUID of the entity affected by the event.
     */
    @Column(nullable = false)
    private UUID entityId;

    /**
     * The processing status: SUCCESS, FAILED, or SKIPPED.
     */
    @Column(nullable = false, length = 20)
    private String status; // SUCCESS, FAILED, SKIPPED

    /**
     * Error message if processing failed. Null if status is SUCCESS or SKIPPED.
     */
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * The time taken to process the event, in milliseconds.
     */
    @Column(name = "duration_ms")
    private Integer durationMs;

    /**
     * Additional metadata about the event, stored as JSON.
     * Includes event-specific data like old/new values, change details, etc.
     */
    @Column(columnDefinition = "TEXT")
    private String metadataJson;
}
