package com.hrms.application.integration.service;

import com.hrms.domain.integration.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Auto-discovering registry for integration connectors.
 *
 * <p>Automatically discovers all {@link IntegrationConnector} Spring beans
 * via constructor injection and builds a registry indexed by connector ID.
 * Provides lookup and capability discovery methods.</p>
 *
 * <p><strong>Discovery:</strong> Connectors are auto-discovered during Spring
 * application initialization. All Spring beans implementing IntegrationConnector
 * are injected via constructor and registered.</p>
 *
 * <p><strong>Lazy Initialization:</strong> The registry is built once during
 * construction and is immutable thereafter. Capabilities are cached in memory.</p>
 */
@Component
@Slf4j
public class ConnectorRegistry {

    private final Map<String, IntegrationConnector> connectorsByIdMap;
    private final Map<String, ConnectorCapabilities> capabilitiesCache;

    /**
     * Constructor with auto-discovery via Spring.
     *
     * <p>Spring automatically injects all IntegrationConnector beans.
     * If no connectors are found, an empty registry is initialized.</p>
     *
     * @param connectors all discovered IntegrationConnector beans
     */
    public ConnectorRegistry(Optional<List<IntegrationConnector>> connectors) {
        this.connectorsByIdMap = new HashMap<>();
        this.capabilitiesCache = new HashMap<>();

        if (connectors.isPresent() && !connectors.get().isEmpty()) {
            log.info("Discovering {} integration connectors", connectors.get().size());
            for (IntegrationConnector connector : connectors.get()) {
                String connectorId = connector.getConnectorId();
                log.debug("Registering connector: {}", connectorId);
                connectorsByIdMap.put(connectorId, connector);
                capabilitiesCache.put(connectorId, connector.getCapabilities());
            }
            log.info("Successfully registered {} connectors: {}",
                connectorsByIdMap.size(), connectorsByIdMap.keySet());
        } else {
            log.info("No integration connectors found");
        }
    }

    /**
     * Retrieves a connector by ID.
     *
     * @param connectorId the connector ID (e.g., "docusign", "slack")
     * @return the connector instance
     * @throws IllegalArgumentException if the connector is not registered
     */
    public IntegrationConnector getConnector(String connectorId) {
        return connectorsByIdMap.computeIfAbsent(connectorId, id -> {
            throw new IllegalArgumentException("Connector not registered: " + id);
        });
    }

    /**
     * Retrieves a connector by ID, returning an Optional.
     *
     * @param connectorId the connector ID
     * @return an Optional containing the connector, or empty if not found
     */
    public Optional<IntegrationConnector> findConnector(String connectorId) {
        return Optional.ofNullable(connectorsByIdMap.get(connectorId));
    }

    /**
     * Retrieves all registered connectors.
     *
     * @return an immutable collection of all connector instances
     */
    public Collection<IntegrationConnector> getAllConnectors() {
        return Collections.unmodifiableCollection(connectorsByIdMap.values());
    }

    /**
     * Retrieves all connector IDs.
     *
     * @return an immutable set of all connector IDs
     */
    public Set<String> getAllConnectorIds() {
        return Collections.unmodifiableSet(connectorsByIdMap.keySet());
    }

    /**
     * Checks if a connector is registered.
     *
     * @param connectorId the connector ID
     * @return true if the connector is registered, false otherwise
     */
    public boolean isConnectorRegistered(String connectorId) {
        return connectorsByIdMap.containsKey(connectorId);
    }

    /**
     * Retrieves the capabilities of a connector.
     *
     * <p>Returns cached capabilities without instantiating the connector.</p>
     *
     * @param connectorId the connector ID
     * @return the connector's capabilities
     * @throws IllegalArgumentException if the connector is not registered
     */
    public ConnectorCapabilities getCapabilities(String connectorId) {
        return capabilitiesCache.computeIfAbsent(connectorId, id -> {
            throw new IllegalArgumentException("Connector not registered: " + id);
        });
    }

    /**
     * Retrieves the capabilities of a connector, returning an Optional.
     *
     * @param connectorId the connector ID
     * @return an Optional containing the capabilities, or empty if not found
     */
    public Optional<ConnectorCapabilities> findCapabilities(String connectorId) {
        return Optional.ofNullable(capabilitiesCache.get(connectorId));
    }

    /**
     * Retrieves a map of all connectors indexed by ID and their capabilities.
     *
     * @return an immutable map from connector ID to capabilities
     */
    public Map<String, ConnectorCapabilities> getCapabilitiesMap() {
        return Collections.unmodifiableMap(capabilitiesCache);
    }

    /**
     * Finds all connectors that support a specific event type.
     *
     * @param eventType the event type (e.g., "employee.created")
     * @return a list of connectors that support this event
     */
    public List<IntegrationConnector> findConnectorsByEventType(String eventType) {
        return connectorsByIdMap.values().stream()
            .filter(connector -> connector.getCapabilities().supportedEvents().contains(eventType))
            .collect(Collectors.toUnmodifiableList());
    }

    /**
     * Finds all connectors that support webhook callbacks.
     *
     * @return a list of connectors supporting webhooks
     */
    public List<IntegrationConnector> findConnectorsWithWebhookSupport() {
        return connectorsByIdMap.values().stream()
            .filter(connector -> connector.getCapabilities().supportsWebhookCallback())
            .collect(Collectors.toUnmodifiableList());
    }

    /**
     * Returns the total number of registered connectors.
     *
     * @return the number of connectors
     */
    public int getConnectorCount() {
        return connectorsByIdMap.size();
    }

    /**
     * Returns a human-readable summary of registered connectors.
     *
     * @return a summary string
     */
    @Override
    public String toString() {
        if (connectorsByIdMap.isEmpty()) {
            return "ConnectorRegistry{connectors: []}";
        }
        return "ConnectorRegistry{connectors: " + connectorsByIdMap.keySet() + "}";
    }
}
