package com.hrms.infrastructure.kafka.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * Event published for every significant action in the system for audit trail recording.
 *
 * <p>Asynchronously persisted to the audit_logs table. Never fails (logs errors but doesn't
 * re-throw) to ensure audit events don't block critical operations.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AuditEvent extends BaseKafkaEvent {

    /**
     * User ID who performed the action.
     */
    @JsonProperty("user_id")
    private UUID userId;

    /**
     * Action performed: CREATE, UPDATE, DELETE, APPROVE, REJECT, EXPORT, etc.
     */
    @JsonProperty("action")
    private String action;

    /**
     * Entity type (resource name): Employee, LeaveRequest, ExpenseClaim, Asset, etc.
     */
    @JsonProperty("entity_type")
    private String entityType;

    /**
     * ID of the entity affected.
     */
    @JsonProperty("entity_id")
    private UUID entityId;

    /**
     * JSON representation of the previous state (for updates and deletes).
     */
    @JsonProperty("old_value")
    private String oldValue;

    /**
     * JSON representation of the new state (for creates and updates).
     */
    @JsonProperty("new_value")
    private String newValue;

    /**
     * IP address of the client that initiated the action.
     */
    @JsonProperty("ip_address")
    private String ipAddress;

    /**
     * User agent from the HTTP request.
     */
    @JsonProperty("user_agent")
    private String userAgent;

    /**
     * HTTP method: GET, POST, PUT, PATCH, DELETE, etc.
     */
    @JsonProperty("method")
    private String method;

    /**
     * Endpoint URI accessed.
     */
    @JsonProperty("uri")
    private String uri;

    /**
     * HTTP response status code.
     */
    @JsonProperty("status_code")
    private Integer statusCode;

    /**
     * Duration of the operation in milliseconds.
     */
    @JsonProperty("duration_ms")
    private Long durationMs;

    /**
     * Optional reason/comment for the action (e.g., rejection reason).
     */
    @JsonProperty("description")
    private String description;
}
