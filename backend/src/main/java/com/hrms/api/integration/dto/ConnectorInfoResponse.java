package com.hrms.api.integration.dto;

import com.hrms.domain.integration.ConnectorCapabilities;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO representing information about an integration connector.
 *
 * <p>Provides details about a connector's identity, type, capabilities,
 * and current health status. Used in API responses to describe available
 * connectors.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorInfoResponse {

    /**
     * The unique identifier for the connector (e.g., "docusign", "slack").
     */
    private String connectorId;

    /**
     * Human-readable name for the connector.
     */
    private String name;

    /**
     * A brief description of what the connector does.
     */
    private String description;

    /**
     * The type of connector (e.g., "DOCUMENT_SIGNING", "MESSAGING", "PAYMENT").
     */
    private String type;

    /**
     * The current status (e.g., "ACTIVE", "INACTIVE", "ERROR").
     */
    private String status;

    /**
     * The capabilities of the connector (supported events, webhook support, etc.).
     */
    private ConnectorCapabilities capabilities;

    /**
     * Timestamp of the last health check.
     * Null if health check has never been performed.
     */
    private LocalDateTime lastHealthCheckAt;

    /**
     * Error message from the last failed health check.
     * Null if the last health check was successful or has not been performed.
     */
    private String lastErrorMessage;
}
