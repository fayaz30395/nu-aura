package com.hrms.domain.integration;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Immutable record representing the configuration for a specific connector instance.
 *
 * <p>Contains tenant-specific settings, event subscriptions, and connector identity.
 * Configuration values are decrypted before being wrapped in this record.</p>
 */
public record ConnectorConfig(
        /**
         * The tenant ID that owns this configuration.
         */
        UUID tenantId,

        /**
         * The connector ID (e.g., "docusign", "slack", "twilio").
         */
        String connectorId,

        /**
         * Configuration settings as key-value pairs.
         * Keys and values depend on the connector type.
         * Values may include API keys, URLs, or feature flags.
         */
        Map<String, Object> settings,

        /**
         * Set of event types this connector instance is subscribed to.
         * Examples: "employee.created", "leave.approved", "payroll.calculated".
         */
        Set<String> eventSubscriptions
) {

    /**
     * Validates that required fields are non-null and not empty.
     */
    public ConnectorConfig {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId cannot be null");
        }
        if (connectorId == null || connectorId.isBlank()) {
            throw new IllegalArgumentException("connectorId cannot be null or empty");
        }
        if (settings == null) {
            throw new IllegalArgumentException("settings cannot be null");
        }
        if (eventSubscriptions == null) {
            throw new IllegalArgumentException("eventSubscriptions cannot be null");
        }
    }

    /**
     * Checks if this connector is subscribed to a specific event type.
     */
    public boolean isSubscribedTo(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return false;
        }
        return eventSubscriptions.contains(eventType);
    }
}
