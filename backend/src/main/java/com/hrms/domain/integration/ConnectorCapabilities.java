package com.hrms.domain.integration;

import java.util.Map;
import java.util.Set;

/**
 * Immutable record describing the capabilities of an integration connector.
 *
 * <p>Used to advertise what a connector implementation supports, enabling
 * the framework to determine which operations are available without
 * instantiating the connector.</p>
 */
public record ConnectorCapabilities(
    /**
     * Set of event types this connector can subscribe to (e.g., "employee.created").
     */
    Set<String> supportedEvents,

    /**
     * Whether this connector supports receiving webhook callbacks from external services.
     */
    boolean supportsWebhookCallback,

    /**
     * Whether this connector exposes action buttons in the UI for manual operations.
     */
    boolean supportsActionButtons,

    /**
     * Whether this connector supports batch operations.
     */
    boolean supportsBatchOperations,

    /**
     * JSON schema defining the expected structure of {@link ConnectorConfig#settings()}.
     * Used for configuration UI validation and documentation.
     */
    String configSchemaJson
) {

    /**
     * Validates that required fields are non-null.
     */
    public ConnectorCapabilities {
        if (supportedEvents == null) {
            throw new IllegalArgumentException("supportedEvents cannot be null");
        }
        if (configSchemaJson == null) {
            throw new IllegalArgumentException("configSchemaJson cannot be null");
        }
    }
}
