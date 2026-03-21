package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing an integration event log entry.
 *
 * <p>Provides details about an event that was routed to a connector,
 * including processing status, duration, and error information if
 * applicable.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationEventLogResponse {

    /**
     * The unique identifier for this log entry.
     */
    private UUID id;

    /**
     * The connector ID that processed (or attempted to process) the event.
     */
    private String connectorId;

    /**
     * The type of event that was processed (e.g., "employee.created", "leave.approved").
     */
    private String eventType;

    /**
     * The type of the entity affected by the event (e.g., "Employee", "LeaveRequest").
     */
    private String entityType;

    /**
     * The UUID of the entity affected by the event.
     */
    private UUID entityId;

    /**
     * The processing status: SUCCESS, FAILED, or SKIPPED.
     */
    private String status;

    /**
     * Error message if processing failed.
     * Null if status is SUCCESS.
     */
    private String errorMessage;

    /**
     * The time taken to process the event, in milliseconds.
     */
    private Integer durationMs;

    /**
     * Timestamp when the event was logged.
     */
    private LocalDateTime createdAt;
}
