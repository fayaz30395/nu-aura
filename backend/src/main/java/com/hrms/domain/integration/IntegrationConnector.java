package com.hrms.domain.integration;

import java.util.Map;

/**
 * Core interface for integration connectors.
 *
 * <p>All external service integrations (e.g., DocuSign, Slack, Twilio) implement
 * this interface. Implementations are auto-discovered by the framework via Spring
 * component scanning and registered in the {@link com.hrms.application.integration.service.ConnectorRegistry}.</p>
 *
 * <p><strong>Lifecycle:</strong></p>
 * <ol>
 *   <li>{@link #getConnectorId()} and {@link #getCapabilities()} are called during registration.</li>
 *   <li>{@link #testConnection(ConnectorConfig)} is called when users test a configuration.</li>
 *   <li>{@link #configure(ConnectorConfig)} is called after successful configuration.</li>
 *   <li>{@link #handleEvent(IntegrationEvent)} is called for subscribed events.</li>
 *   <li>{@link #handleWebhookCallback(String, Map, String)} is called for webhook deliveries.</li>
 * </ol>
 *
 * <p><strong>Threading:</strong> Implementations should be thread-safe. Multiple threads
 * may call methods on the same connector instance concurrently.</p>
 */
public interface IntegrationConnector {

    /**
     * Returns the unique identifier for this connector.
     *
     * <p>Must be a stable, lowercase identifier (e.g., "docusign", "slack", "twilio").
     * Used as the primary key when storing configurations.</p>
     *
     * @return the connector ID
     */
    String getConnectorId();

    /**
     * Returns the connector type (category).
     *
     * @return the connector type
     */
    ConnectorType getType();

    /**
     * Returns the capabilities advertised by this connector.
     *
     * <p>Called during registration to determine what events and features are available.
     * The result is cached by the framework.</p>
     *
     * @return connector capabilities
     */
    ConnectorCapabilities getCapabilities();

    /**
     * Tests the connection to the external service using the provided configuration.
     *
     * <p>Called when a user wants to validate their settings before saving.
     * Should make a lightweight test call to the external service and return
     * success/failure with diagnostic information.</p>
     *
     * <p>This method should NOT store any state or modify the connector's configuration.
     * It should be idempotent and not cause side effects.</p>
     *
     * @param config the configuration to test
     * @return a ConnectionTestResult with success/failure and diagnostics
     */
    ConnectionTestResult testConnection(ConnectorConfig config);

    /**
     * Configures the connector with the provided settings.
     *
     * <p>Called after a configuration is successfully tested and saved.
     * The connector should store any necessary client objects, API keys, or
     * other state needed for later operations.</p>
     *
     * <p>If configuration fails (e.g., invalid API key), implementations should
     * throw an exception or mark the connector in error state. The framework
     * will catch exceptions and update the connector status to ERROR.</p>
     *
     * @param config the configuration to apply
     */
    void configure(ConnectorConfig config);

    /**
     * Handles an integration event that this connector is subscribed to.
     *
     * <p>Called asynchronously when the event occurs. Implementations should
     * process the event and trigger appropriate actions in the external service
     * (e.g., send notification, create record).</p>
     *
     * <p>Exceptions thrown here are logged but do not fail the overall event
     * processing. Implementations should handle errors gracefully.</p>
     *
     * @param event the integration event to handle
     */
    void handleEvent(IntegrationEvent event);

    /**
     * Handles a webhook callback from the external service.
     *
     * <p>Called when the external service sends data back to NU-AURA
     * (e.g., document signed, message delivery confirmed).
     * Implementations should validate the callback (signature, timestamp)
     * and update internal state accordingly.</p>
     *
     * <p>The connector ID is provided separately to allow stateless implementations.</p>
     *
     * @param connectorId the ID of the connector receiving the callback
     * @param headers HTTP headers from the webhook request
     * @param body the raw body of the webhook request
     * @return a WebhookCallbackResult indicating success/failure
     */
    WebhookCallbackResult handleWebhookCallback(String connectorId, Map<String, String> headers, String body);
}
