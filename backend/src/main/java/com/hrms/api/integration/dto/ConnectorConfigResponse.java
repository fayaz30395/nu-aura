package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * DTO representing a connector configuration (without sensitive data).
 *
 * <p>Provides configuration metadata and event subscriptions. Sensitive
 * configuration settings (e.g., API keys) are intentionally excluded
 * for security reasons. Configuration settings are encrypted in the
 * database and never exposed in responses.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorConfigResponse {

    /**
     * The unique identifier for this configuration instance.
     */
    private UUID id;

    /**
     * The connector ID (e.g., "docusign", "slack").
     */
    private String connectorId;

    /**
     * Human-readable display name for this configuration instance
     * (e.g., "Production DocuSign", "Staging Slack").
     */
    private String displayName;

    /**
     * The current status of this configuration (e.g., "ACTIVE", "INACTIVE", "ERROR").
     */
    private String status;

    /**
     * The set of event types this connector is subscribed to.
     * Examples: ["employee.created", "leave.approved"]
     */
    private Set<String> eventSubscriptions;

    /**
     * Timestamp of the last health check for this configuration.
     * Null if health check has never been performed.
     */
    private LocalDateTime lastHealthCheckAt;

    /**
     * Timestamp when this configuration was created.
     */
    private LocalDateTime createdAt;

    /**
     * Timestamp when this configuration was last modified.
     */
    private LocalDateTime updatedAt;

    /**
     * Note: The configSettings map is intentionally excluded from this response
     * for security reasons. Sensitive configuration data is never exposed
     * in API responses.
     */
}
