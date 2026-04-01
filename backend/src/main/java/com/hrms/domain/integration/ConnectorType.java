package com.hrms.domain.integration;

/**
 * Enumeration of supported integration connector types.
 *
 * <p>Each type represents a category of external service that NU-AURA
 * can integrate with. Connectors are instantiated based on type.</p>
 */
public enum ConnectorType {
    NOTIFICATION("Notification Services"),
    E_SIGNATURE("E-Signature Services"),
    PAYMENT("Payment Processing"),
    STORAGE("Cloud Storage"),
    CALENDAR("Calendar & Scheduling"),
    AUTH("Authentication"),
    ANALYTICS("Analytics");

    private final String displayName;

    ConnectorType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
