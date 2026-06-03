package com.nulogic.application.integration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.util.UrlAllowlistValidator;
import com.nulogic.domain.integration.ConnectorConfig;
import com.nulogic.domain.integration.ConnectorStatus;
import com.nulogic.domain.integration.IntegrationConnectorConfigEntity;
import com.nulogic.infrastructure.integration.repository.IntegrationConnectorConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Service for managing integration connector configurations.
 *
 * <p>Handles CRUD operations, encryption/decryption, and health checks
 * for connector configurations stored in the database.</p>
 *
 * <p><strong>Threading:</strong> This service is thread-safe. Spring ensures
 * that repositories are thread-safe, and we use local ObjectMapper instances
 * which are also thread-safe.</p>
 */
@Service
@Slf4j
public class IntegrationConnectorConfigService {

    /**
     * Settings keys whose values are outbound URLs. We validate them against the
     * SSRF allowlist at write time so a tenant admin cannot persist a baseUrl
     * pointing at {@code 169.254.169.254} (cloud metadata) or internal services.
     *
     * <p>Keys are matched case-insensitively. Add new URL-bearing settings here
     * when introducing new connectors.</p>
     */
    private static final java.util.Set<String> URL_SETTING_KEYS = java.util.Set.of(
            "baseurl", "webhookurl", "callbackurl", "apiurl", "tokenendpoint", "endpoint"
    );

    private final IntegrationConnectorConfigRepository repository;
    private final ObjectMapper objectMapper;
    private final UrlAllowlistValidator urlAllowlistValidator;

    public IntegrationConnectorConfigService(
            IntegrationConnectorConfigRepository repository,
            ObjectMapper objectMapper,
            UrlAllowlistValidator urlAllowlistValidator) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.urlAllowlistValidator = urlAllowlistValidator;
    }

    /**
     * Retrieves the configuration for a specific connector instance.
     *
     * <p>Decrypts the configuration JSON and returns a {@link ConnectorConfig} record
     * with parsed settings and event subscriptions.</p>
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID (e.g., "docusign")
     * @return the parsed configuration
     * @throws IllegalArgumentException if the connector is not configured or invalid
     */
    @Transactional(readOnly = true)
    public ConnectorConfig getConfig(UUID tenantId, String connectorId) {
        log.debug("Retrieving configuration for connector: {} in tenant: {}", connectorId, tenantId);

        IntegrationConnectorConfigEntity entity = repository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Connector configuration not found: " + connectorId));

        return entity.toConnectorConfig(objectMapper);
    }

    /**
     * Creates or updates a connector configuration.
     *
     * <p>Serializes the settings and event subscriptions to JSON and stores them
     * in the database. If a configuration already exists, it is updated; otherwise,
     * a new one is created.</p>
     *
     * @param tenantId           the tenant ID (required for isolation)
     * @param connectorId        the connector ID
     * @param settings           the configuration settings
     * @param eventSubscriptions the set of events to subscribe to
     * @return the saved configuration entity
     */
    @Transactional
    public IntegrationConnectorConfigEntity saveConfig(
            UUID tenantId,
            String connectorId,
            Map<String, Object> settings,
            Set<String> eventSubscriptions) {

        log.info("Saving configuration for connector: {} in tenant: {}", connectorId, tenantId);

        // SECURITY: tenant admins control these settings via the connector REST API.
        // Reject any URL-bearing setting that points at internal/metadata/non-allowed-port
        // addresses BEFORE we persist — so a later background job can't be tricked into
        // calling it. Mirrors WebhookService's create/update guard.
        validateUrlSettings(settings, connectorId);

        IntegrationConnectorConfigEntity entity = repository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElse(null);

        if (entity == null) {
            // Create new configuration
            entity = IntegrationConnectorConfigEntity.builder()
                    .tenantId(tenantId)
                    .connectorId(connectorId)
                    .displayName(connectorId) // Default display name
                    .status(ConnectorStatus.INACTIVE)
                    .build();
        }

        // Update configuration
        ConnectorConfig config = new ConnectorConfig(tenantId, connectorId, settings, eventSubscriptions);
        entity.updateFromConnectorConfig(config, objectMapper);

        return repository.save(entity);
    }

    /**
     * Finds the (non-deleted) configuration entity for a connector instance.
     *
     * <p>Exposes the underlying entity lookup so controllers can read presentation
     * fields (display name, health-check timestamps, error message) without injecting
     * the repository directly. Returns an empty Optional when no active configuration
     * exists for the tenant/connector pair.</p>
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID
     * @return the configuration entity if present and not deleted
     */
    @Transactional(readOnly = true)
    public Optional<IntegrationConnectorConfigEntity> findConfigEntity(UUID tenantId, String connectorId) {
        return repository.findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId);
    }

    /**
     * Persists changes to a connector configuration entity.
     *
     * <p>Used by callers that mutate presentation-only fields (e.g. display name)
     * on an entity already returned by {@link #saveConfig} and need to flush them.</p>
     *
     * @param entity the entity to save
     * @return the saved entity
     */
    @Transactional
    public IntegrationConnectorConfigEntity saveEntity(IntegrationConnectorConfigEntity entity) {
        return repository.save(entity);
    }

    /**
     * Finds all active connector configurations subscribed to a specific event type.
     *
     * @param tenantId  the tenant ID (required for isolation)
     * @param eventType the event type (e.g., "employee.created")
     * @return list of active configurations subscribed to this event
     */
    @Transactional(readOnly = true)
    public List<IntegrationConnectorConfigEntity> findActiveByEventSubscription(UUID tenantId, String eventType) {
        log.debug("Finding active connectors subscribed to event: {} in tenant: {}", eventType, tenantId);
        return repository.findActiveByEventSubscription(tenantId, eventType);
    }

    /**
     * Activates a connector configuration (sets status to ACTIVE).
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID
     * @throws IllegalArgumentException if the connector is not configured
     */
    @Transactional
    public void activate(UUID tenantId, String connectorId) {
        log.info("Activating connector: {} in tenant: {}", connectorId, tenantId);

        IntegrationConnectorConfigEntity entity = repository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Connector configuration not found: " + connectorId));

        entity.setStatus(ConnectorStatus.ACTIVE);
        repository.save(entity);
    }

    /**
     * Deactivates a connector configuration (sets status to INACTIVE).
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID
     * @throws IllegalArgumentException if the connector is not configured
     */
    @Transactional
    public void deactivate(UUID tenantId, String connectorId) {
        log.info("Deactivating connector: {} in tenant: {}", connectorId, tenantId);

        IntegrationConnectorConfigEntity entity = repository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Connector configuration not found: " + connectorId));

        entity.setStatus(ConnectorStatus.INACTIVE);
        repository.save(entity);
    }

    /**
     * Records a successful health check for a connector.
     *
     * <p>Clears the error message and updates the last_health_check_at timestamp.</p>
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID
     * @throws IllegalArgumentException if the connector is not configured
     */
    @Transactional
    public void recordHealthCheckSuccess(UUID tenantId, String connectorId) {
        log.debug("Recording health check success for connector: {} in tenant: {}", connectorId, tenantId);

        IntegrationConnectorConfigEntity entity = repository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Connector configuration not found: " + connectorId));

        entity.recordHealthCheckSuccess();
        repository.save(entity);
    }

    /**
     * Records a failed health check for a connector.
     *
     * <p>Sets the error message and updates the last_health_check_at timestamp.
     * The connector status is set to ERROR.</p>
     *
     * @param tenantId     the tenant ID (required for isolation)
     * @param connectorId  the connector ID
     * @param errorMessage a description of the failure
     * @throws IllegalArgumentException if the connector is not configured
     */
    @Transactional
    public void recordHealthCheckFailure(UUID tenantId, String connectorId, String errorMessage) {
        log.warn("Recording health check failure for connector: {} in tenant: {}: {}",
                connectorId, tenantId, errorMessage);

        IntegrationConnectorConfigEntity entity = repository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Connector configuration not found: " + connectorId));

        entity.recordHealthCheckFailure(errorMessage);
        repository.save(entity);
    }

    /**
     * Finds all active connector configurations for a tenant.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @return list of active configurations
     */
    @Transactional(readOnly = true)
    public List<IntegrationConnectorConfigEntity> findAllActive(UUID tenantId) {
        log.debug("Finding all active connectors for tenant: {}", tenantId);
        return repository.findByTenantIdAndStatusAndIsDeletedFalse(tenantId, ConnectorStatus.ACTIVE);
    }

    /**
     * Finds all connector configurations for a tenant, regardless of status.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @return list of all configurations
     */
    @Transactional(readOnly = true)
    public List<IntegrationConnectorConfigEntity> findAll(UUID tenantId) {
        log.debug("Finding all connectors for tenant: {}", tenantId);
        return repository.findByTenantIdAndIsDeletedFalse(tenantId);
    }

    /**
     * Soft-deletes a connector configuration (marks as deleted without removing from DB).
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID
     * @throws IllegalArgumentException if the connector is not configured
     */
    @Transactional
    public void delete(UUID tenantId, String connectorId) {
        log.info("Deleting connector configuration: {} in tenant: {}", connectorId, tenantId);

        IntegrationConnectorConfigEntity entity = repository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Connector configuration not found: " + connectorId));

        entity.softDelete();
        repository.save(entity);
    }

    /**
     * Walk the settings map and run every URL-bearing value through the SSRF allowlist.
     *
     * <p>Case-insensitive key matching against {@link #URL_SETTING_KEYS}. Empty/null
     * values are tolerated (treated as "not configured") to keep partial updates working;
     * a non-empty value that fails the allowlist raises {@link com.nulogic.common.exception.BusinessException}
     * via {@link UrlAllowlistValidator#validate(String)}.</p>
     */
    private void validateUrlSettings(Map<String, Object> settings, String connectorId) {
        if (settings == null || settings.isEmpty()) {
            return;
        }
        for (Map.Entry<String, Object> entry : settings.entrySet()) {
            String key = entry.getKey();
            if (key == null) continue;
            if (!URL_SETTING_KEYS.contains(key.toLowerCase())) continue;
            Object value = entry.getValue();
            if (value == null) continue;
            String url = value.toString();
            if (url.isBlank()) continue;
            log.debug("Validating connector {} setting '{}' as outbound URL", connectorId, key);
            urlAllowlistValidator.validate(url);
        }
    }
}
