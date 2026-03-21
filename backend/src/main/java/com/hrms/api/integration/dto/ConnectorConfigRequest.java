package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.Set;

/**
 * DTO for creating or updating a connector configuration.
 *
 * <p>Accepts display name, encrypted configuration settings, and event
 * subscriptions. The configSettings map contains connector-specific
 * credentials and configuration (e.g., API key, account ID).</p>
 *
 * <p><strong>Security Note:</strong> Sensitive configuration settings
 * are encrypted before storage. The raw settings are never logged or
 * exposed in responses.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorConfigRequest {

    /**
     * Human-readable display name for this connector configuration instance
     * (e.g., "Production DocuSign", "Staging Slack").
     */
    private String displayName;

    /**
     * Connector-specific configuration settings.
     * Examples: {"apiKey": "...", "accountId": "..."}, {"webhookUrl": "..."}
     * These settings are encrypted before storage.
     */
    private Map<String, Object> configSettings;

    /**
     * Set of event types this connector is subscribed to.
     * Examples: ["employee.created", "leave.approved", "document.generated"]
     * The connector will receive events matching these types.
     */
    private Set<String> eventSubscriptions;
}
