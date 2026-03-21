package com.hrms.api.integration.controller;

import com.hrms.api.integration.dto.*;
import com.hrms.application.integration.service.ConnectorRegistry;
import com.hrms.application.integration.service.IntegrationConnectorConfigService;
import com.hrms.application.integration.service.IntegrationEventLogService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.integration.ConnectorCapabilities;
import com.hrms.domain.integration.ConnectorConfig;
import com.hrms.domain.integration.ConnectionTestResult;
import com.hrms.domain.integration.IntegrationConnector;
import com.hrms.domain.integration.IntegrationEventLog;
import com.hrms.infrastructure.integration.repository.IntegrationConnectorConfigRepository;
import com.hrms.infrastructure.integration.repository.IntegrationEventLogRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * REST controller for managing integration connectors.
 *
 * <p>Provides endpoints for listing connectors, configuring them, testing connections,
 * activating/deactivating, and retrieving event logs. All endpoints require
 * authenticated users with appropriate permissions.</p>
 *
 * <p><strong>Security:</strong> All endpoints require INTEGRATION:READ or INTEGRATION:MANAGE
 * permissions enforced via {@link RequiresPermission} annotations. Tenant isolation is
 * enforced via {@link TenantContext}.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/integrations")
@RequiredArgsConstructor
public class IntegrationConnectorController {

    private final ConnectorRegistry connectorRegistry;
    private final IntegrationConnectorConfigService configService;
    private final IntegrationEventLogService eventLogService;
    private final IntegrationConnectorConfigRepository configRepository;
    private final IntegrationEventLogRepository eventLogRepository;

    /**
     * Lists all available connectors with their metadata and status.
     *
     * <p>Returns all registered connectors in the system, including their capabilities,
     * current health status, and configuration status. The status indicates whether the
     * connector has been configured and activated for the current tenant.</p>
     *
     * @return a list of connector information
     */
    @GetMapping("/connectors")
    @RequiresPermission(Permission.INTEGRATION_READ)
    public ResponseEntity<List<ConnectorInfoResponse>> listConnectors() {
        log.debug("Listing all available connectors");
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<ConnectorInfoResponse> connectors = connectorRegistry.getAllConnectors()
                .stream()
                .map(connector -> {
                    String connectorId = connector.getConnectorId();
                    // Try to get the configuration for this connector, if it exists
                    var configEntity = configRepository
                            .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId);

                    return ConnectorInfoResponse.builder()
                            .connectorId(connectorId)
                            .name(connector.getConnectorId())
                            .description(connector.getType().name() + " Integration")
                            .type(connector.getType().toString())
                            .status(configEntity.map(e -> e.getStatus().toString()).orElse("UNCONFIGURED"))
                            .capabilities(connector.getCapabilities())
                            .lastHealthCheckAt(configEntity.map(e -> e.getLastHealthCheckAt()).orElse(null))
                            .lastErrorMessage(configEntity.map(e -> e.getLastErrorMessage()).orElse(null))
                            .build();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(connectors);
    }

    /**
     * Retrieves detailed information about a specific connector.
     *
     * <p>Returns the connector's metadata, capabilities, and current configuration status
     * for the current tenant.</p>
     *
     * @param connectorId the connector ID (e.g., "docusign", "slack")
     * @return connector information
     * @throws IllegalArgumentException if the connector is not registered
     */
    @GetMapping("/connectors/{connectorId}")
    @RequiresPermission(Permission.INTEGRATION_READ)
    public ResponseEntity<ConnectorInfoResponse> getConnectorDetails(
            @PathVariable String connectorId) {
        log.debug("Getting details for connector: {}", connectorId);
        UUID tenantId = TenantContext.requireCurrentTenant();

        IntegrationConnector connector = connectorRegistry.getConnector(connectorId);

        var configEntity = configRepository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId);

        ConnectorInfoResponse response = ConnectorInfoResponse.builder()
                .connectorId(connectorId)
                .name(connector.getConnectorId())
                .description(connector.getType().name() + " Integration")
                .type(connector.getType().toString())
                .status(configEntity.map(e -> e.getStatus().toString()).orElse("UNCONFIGURED"))
                .capabilities(connector.getCapabilities())
                .lastHealthCheckAt(configEntity.map(e -> e.getLastHealthCheckAt()).orElse(null))
                .lastErrorMessage(configEntity.map(e -> e.getLastErrorMessage()).orElse(null))
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Saves or updates a connector configuration.
     *
     * <p>Stores the connector configuration (including encrypted credentials) and
     * event subscriptions for the current tenant. If a configuration already exists,
     * it is updated; otherwise, a new configuration is created.</p>
     *
     * @param connectorId the connector ID
     * @param request the configuration request with settings and event subscriptions
     * @return the saved configuration (without sensitive data)
     * @throws IllegalArgumentException if the connector is not registered
     */
    @PutMapping("/connectors/{connectorId}/config")
    @RequiresPermission(Permission.INTEGRATION_MANAGE)
    public ResponseEntity<ConnectorConfigResponse> saveConnectorConfig(
            @PathVariable String connectorId,
            @Valid @RequestBody ConnectorConfigRequest request) {
        log.info("Saving configuration for connector: {}", connectorId);
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Verify the connector exists
        connectorRegistry.getConnector(connectorId);

        var entity = configService.saveConfig(
                tenantId,
                connectorId,
                request.getConfigSettings(),
                request.getEventSubscriptions());

        entity.setDisplayName(request.getDisplayName());
        configRepository.save(entity);

        ConnectorConfigResponse response = ConnectorConfigResponse.builder()
                .id(entity.getId())
                .connectorId(connectorId)
                .displayName(entity.getDisplayName())
                .status(entity.getStatus().toString())
                .eventSubscriptions(getEventSubscriptionsAsSet(entity.getEventSubscriptions()))
                .lastHealthCheckAt(entity.getLastHealthCheckAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Tests the connection to a connector's external service.
     *
     * <p>Attempts to authenticate and connect to the external service (e.g., DocuSign API).
     * Records the result (success/failure) and measures latency.</p>
     *
     * @param connectorId the connector ID
     * @return connection test result with latency information
     * @throws IllegalArgumentException if the connector is not configured
     */
    @PostMapping("/connectors/{connectorId}/test")
    @RequiresPermission(Permission.INTEGRATION_MANAGE)
    public ResponseEntity<ConnectionTestResponse> testConnectorConnection(
            @PathVariable String connectorId) {
        log.info("Testing connection for connector: {}", connectorId);
        UUID tenantId = TenantContext.requireCurrentTenant();

        IntegrationConnector connector = connectorRegistry.getConnector(connectorId);
        ConnectorConfig config = configService.getConfig(tenantId, connectorId);

        long startTime = System.currentTimeMillis();
        try {
            ConnectionTestResult testResult = connector.testConnection(config);
            boolean success = testResult.success();
            long latencyMs = System.currentTimeMillis() - startTime;

            if (success) {
                configService.recordHealthCheckSuccess(tenantId, connectorId);
            }

            return ResponseEntity.ok(ConnectionTestResponse.builder()
                    .success(success)
                    .message(success ? "Connection successful" : "Connection failed")
                    .latencyMs(latencyMs)
                    .build());
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            log.error("Connection test failed for connector: {}", connectorId, e);
            configService.recordHealthCheckFailure(tenantId, connectorId, e.getMessage());

            return ResponseEntity.ok(ConnectionTestResponse.builder()
                    .success(false)
                    .message("Connection test failed: " + e.getMessage())
                    .latencyMs(latencyMs)
                    .build());
        }
    }

    /**
     * Activates a connector configuration.
     *
     * <p>Sets the connector status to ACTIVE, enabling it to receive and process events.</p>
     *
     * @param connectorId the connector ID
     * @return the updated configuration
     * @throws IllegalArgumentException if the connector is not configured
     */
    @PostMapping("/connectors/{connectorId}/activate")
    @RequiresPermission(Permission.INTEGRATION_MANAGE)
    public ResponseEntity<ConnectorConfigResponse> activateConnector(
            @PathVariable String connectorId) {
        log.info("Activating connector: {}", connectorId);
        UUID tenantId = TenantContext.requireCurrentTenant();

        configService.activate(tenantId, connectorId);

        var configEntity = configRepository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Configuration not found after activation: " + connectorId));

        ConnectorConfigResponse response = ConnectorConfigResponse.builder()
                .id(configEntity.getId())
                .connectorId(connectorId)
                .displayName(configEntity.getDisplayName())
                .status(configEntity.getStatus().toString())
                .eventSubscriptions(getEventSubscriptionsAsSet(configEntity.getEventSubscriptions()))
                .lastHealthCheckAt(configEntity.getLastHealthCheckAt())
                .createdAt(configEntity.getCreatedAt())
                .updatedAt(configEntity.getUpdatedAt())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Deactivates a connector configuration.
     *
     * <p>Sets the connector status to INACTIVE, preventing it from receiving and
     * processing events until it is reactivated.</p>
     *
     * @param connectorId the connector ID
     * @return the updated configuration
     * @throws IllegalArgumentException if the connector is not configured
     */
    @PostMapping("/connectors/{connectorId}/deactivate")
    @RequiresPermission(Permission.INTEGRATION_MANAGE)
    public ResponseEntity<ConnectorConfigResponse> deactivateConnector(
            @PathVariable String connectorId) {
        log.info("Deactivating connector: {}", connectorId);
        UUID tenantId = TenantContext.requireCurrentTenant();

        configService.deactivate(tenantId, connectorId);

        var configEntity = configRepository
                .findByTenantIdAndConnectorIdAndIsDeletedFalse(tenantId, connectorId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Configuration not found after deactivation: " + connectorId));

        ConnectorConfigResponse response = ConnectorConfigResponse.builder()
                .id(configEntity.getId())
                .connectorId(connectorId)
                .displayName(configEntity.getDisplayName())
                .status(configEntity.getStatus().toString())
                .eventSubscriptions(getEventSubscriptionsAsSet(configEntity.getEventSubscriptions()))
                .lastHealthCheckAt(configEntity.getLastHealthCheckAt())
                .createdAt(configEntity.getCreatedAt())
                .updatedAt(configEntity.getUpdatedAt())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves the integration event log for the current tenant.
     *
     * <p>Returns a paginated list of events that were processed by connectors,
     * including successful, failed, and skipped events. Results can be filtered
     * by status and sorted by creation date.</p>
     *
     * @param status optional filter by event status (SUCCESS, FAILED, SKIPPED)
     * @param page the page number (0-indexed, default 0)
     * @param size the page size (default 20, max 100)
     * @param sortBy the field to sort by (default "createdAt")
     * @param sortDir the sort direction (ASC or DESC, default DESC)
     * @return a page of event log entries
     */
    @GetMapping("/events")
    @RequiresPermission(Permission.INTEGRATION_READ)
    public ResponseEntity<Page<IntegrationEventLogResponse>> getIntegrationEventLog(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        log.debug("Retrieving integration event log for tenant");
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Validate and limit page size
        if (size > 100) {
            size = 100;
        }

        Sort.Direction direction = Sort.Direction.valueOf(sortDir.toUpperCase());
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<IntegrationEventLog> eventPage;
        if (status != null && !status.isEmpty()) {
            eventPage = eventLogRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(
                    tenantId, status, pageable);
        } else {
            eventPage = eventLogRepository.findByTenantIdOrderByCreatedAtDesc(
                    tenantId, pageable);
        }

        Page<IntegrationEventLogResponse> responsePage = eventPage.map(event ->
                IntegrationEventLogResponse.builder()
                        .id(event.getId())
                        .connectorId(event.getConnectorId())
                        .eventType(event.getEventType())
                        .entityType(event.getEntityType())
                        .entityId(event.getEntityId())
                        .status(event.getStatus())
                        .errorMessage(event.getErrorMessage())
                        .durationMs(event.getDurationMs())
                        .createdAt(event.getCreatedAt())
                        .build());

        return ResponseEntity.ok(responsePage);
    }

    private Set<String> getEventSubscriptionsAsSet(String eventSubscriptions) {
        if (eventSubscriptions == null || eventSubscriptions.isBlank()) {
            return Collections.emptySet();
        }
        return Arrays.stream(eventSubscriptions.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }
}
