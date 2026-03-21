package com.hrms.infrastructure.integration.repository;

import com.hrms.domain.integration.ConnectorStatus;
import com.hrms.domain.integration.IntegrationConnectorConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link IntegrationConnectorConfigEntity}.
 *
 * <p><strong>SECURITY:</strong> All queries include mandatory tenant isolation
 * via {@code tenantId} parameters and {@code isDeleted = false} predicates.</p>
 *
 * <p>The database enforces PostgreSQL RLS (Row Level Security) as an additional
 * layer of protection.</p>
 */
@Repository
public interface IntegrationConnectorConfigRepository extends JpaRepository<IntegrationConnectorConfigEntity, UUID> {

    /**
     * Finds a connector configuration by tenant and connector ID, excluding soft-deleted rows.
     *
     * <p>The unique constraint on (tenant_id, connector_id) ensures at most one active
     * configuration per connector type per tenant.</p>
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param connectorId the connector ID (e.g., "docusign")
     * @return the configuration if found and not deleted
     */
    Optional<IntegrationConnectorConfigEntity> findByTenantIdAndConnectorIdAndIsDeletedFalse(
        UUID tenantId, String connectorId);

    /**
     * Finds all connector configurations for a tenant with a specific status, excluding soft-deleted rows.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param status the desired connector status (ACTIVE, INACTIVE, ERROR)
     * @return list of matching configurations
     */
    List<IntegrationConnectorConfigEntity> findByTenantIdAndStatusAndIsDeletedFalse(
        UUID tenantId, ConnectorStatus status);

    /**
     * Finds all connector configurations for a tenant, excluding soft-deleted rows.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @return list of all active configurations for the tenant
     */
    List<IntegrationConnectorConfigEntity> findByTenantIdAndIsDeletedFalse(UUID tenantId);

    /**
     * Finds all active connector configurations for a tenant that are subscribed to a specific event type.
     *
     * <p>Event subscriptions are stored as comma-separated strings in the event_subscriptions column.
     * Uses a LIKE query with wildcard patterns to find matching subscriptions.</p>
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param eventType the event type to search for (e.g., "employee.created")
     * @return list of configurations subscribed to this event
     */
    @Query("""
        SELECT c FROM IntegrationConnectorConfigEntity c
        WHERE c.tenantId = :tenantId
        AND c.status = 'ACTIVE'
        AND c.isDeleted = false
        AND (
            c.eventSubscriptions LIKE CONCAT('%', :eventType, '%')
        )
        """)
    List<IntegrationConnectorConfigEntity> findActiveByEventSubscription(
        @Param("tenantId") UUID tenantId,
        @Param("eventType") String eventType);
}
