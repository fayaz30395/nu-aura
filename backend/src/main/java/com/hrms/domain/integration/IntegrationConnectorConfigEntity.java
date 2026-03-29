package com.hrms.domain.integration;

import com.hrms.common.converter.EncryptedStringConverter;
import com.hrms.common.entity.TenantAware;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.*;

/**
 * JPA entity for storing integration connector configurations.
 *
 * <p>Maps to the {@code integration_connector_configs} table. Each row represents
 * a configured connector instance for a specific tenant.</p>
 *
 * <p><strong>Encryption:</strong> The {@code configJson} field stores sensitive
 * configuration data (API keys, tokens, URLs). TODO: Apply field-level encryption
 * using {@code @Convert(converter = EncryptedStringConverter.class)} when available.</p>
 *
 * <p><strong>Multi-Tenancy:</strong> Extends {@link TenantAware} which automatically
 * handles tenant isolation via Spring Data JPA queries and PostgreSQL RLS.</p>
 */
@Entity
@SQLRestriction("is_deleted = false")
@Table(name = "integration_connector_configs", indexes = {
    @Index(name = "idx_icc_tenant_id", columnList = "tenant_id"),
    @Index(name = "idx_icc_connector_id", columnList = "connector_id"),
    @Index(name = "idx_icc_status", columnList = "status"),
    @Index(name = "idx_icc_is_deleted", columnList = "is_deleted")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IntegrationConnectorConfigEntity extends TenantAware {

    /**
     * The connector ID (e.g., "docusign", "slack", "twilio").
     * Unique per tenant along with connector_id (enforced via DB constraint).
     */
    @Column(name = "connector_id", nullable = false, length = 50)
    private String connectorId;

    /**
     * Display name for the connector in the UI (e.g., "DocuSign Account #1").
     */
    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    /**
     * JSON-serialized configuration settings.
     * Includes API keys, URLs, feature flags, and other sensitive data.
     *
     * CRIT-3 FIX: Field-level AES-256-GCM encryption via EncryptedStringConverter.
     * The encryption key is loaded from the ENCRYPTION_KEY environment variable.
     */
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "config_json", nullable = false, columnDefinition = "TEXT")
    private String configJson;

    /**
     * The operational status of this connector configuration.
     */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ConnectorStatus status;

    /**
     * Comma-separated list of event types this connector is subscribed to.
     * Example: "employee.created,leave.approved,payroll.calculated"
     */
    @Column(name = "event_subscriptions", columnDefinition = "TEXT")
    private String eventSubscriptions;

    /**
     * Timestamp of the last health check (connection test).
     */
    @Column(name = "last_health_check_at")
    private LocalDateTime lastHealthCheckAt;

    /**
     * Error message from the last failed health check or configuration attempt.
     * Null if the last operation succeeded.
     */
    @Column(name = "last_error_message", columnDefinition = "TEXT")
    private String lastErrorMessage;

    // ==================== HELPER METHODS ====================

    /**
     * Converts the JSON-serialized configuration to a {@link ConnectorConfig} record.
     *
     * <p>Decrypts the config_json and parses event subscriptions from comma-separated string.</p>
     *
     * @param objectMapper the ObjectMapper to use for deserialization
     * @return the parsed ConnectorConfig
     * @throws IllegalArgumentException if config_json is invalid
     */
    public ConnectorConfig toConnectorConfig(ObjectMapper objectMapper) {
        try {
            // Parse config_json to Map<String, Object>
            @SuppressWarnings("unchecked")
            Map<String, Object> settings = objectMapper.readValue(configJson, Map.class);

            // Parse event_subscriptions from comma-separated string to Set
            Set<String> subscriptions = new HashSet<>();
            if (eventSubscriptions != null && !eventSubscriptions.isBlank()) {
                String[] events = eventSubscriptions.split(",");
                for (String event : events) {
                    String trimmed = event.trim();
                    if (!trimmed.isEmpty()) {
                        subscriptions.add(trimmed);
                    }
                }
            }

            return new ConnectorConfig(getTenantId(), connectorId, settings, subscriptions);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                "Failed to parse connector configuration: " + e.getMessage(), e);
        }
    }

    /**
     * Updates the configuration JSON and event subscriptions from a {@link ConnectorConfig}.
     *
     * <p>Called when updating connector settings.</p>
     *
     * @param config the source config
     * @param objectMapper the ObjectMapper to use for serialization
     * @throws IllegalArgumentException if serialization fails
     */
    public void updateFromConnectorConfig(ConnectorConfig config, ObjectMapper objectMapper) {
        try {
            this.configJson = objectMapper.writeValueAsString(config.settings());
            this.eventSubscriptions = String.join(",", config.eventSubscriptions());
        } catch (Exception e) {
            throw new IllegalArgumentException(
                "Failed to serialize connector configuration: " + e.getMessage(), e);
        }
    }

    /**
     * Updates the health check timestamp and clears the error message on success.
     */
    public void recordHealthCheckSuccess() {
        this.lastHealthCheckAt = LocalDateTime.now();
        this.lastErrorMessage = null;
    }

    /**
     * Records a health check failure with an error message and updates status to ERROR.
     */
    public void recordHealthCheckFailure(String errorMessage) {
        this.lastHealthCheckAt = LocalDateTime.now();
        this.lastErrorMessage = errorMessage;
        this.status = ConnectorStatus.ERROR;
    }
}
