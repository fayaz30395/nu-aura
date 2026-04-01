package com.hrms.domain.integration;

/**
 * Enumeration of connector configuration statuses.
 *
 * <p>Tracks the operational state of a connector instance within a tenant.</p>
 */
public enum ConnectorStatus {
    ACTIVE("Connector is active and operational"),
    INACTIVE("Connector is configured but not active"),
    ERROR("Connector encountered an error");

    private final String description;

    ConnectorStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
