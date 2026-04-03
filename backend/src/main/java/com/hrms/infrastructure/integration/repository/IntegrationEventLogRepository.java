package com.hrms.infrastructure.integration.repository;

import com.hrms.domain.integration.IntegrationEventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Spring Data JPA repository for IntegrationEventLog entities.
 *
 * <p>Provides query methods for retrieving event logs filtered by tenant,
 * connector, and status. Includes methods for event log cleanup based on
 * retention policies.</p>
 */
@Repository
public interface IntegrationEventLogRepository extends JpaRepository<IntegrationEventLog, UUID> {

    /**
     * Finds all event logs for a specific connector in a tenant, ordered by creation date descending.
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID (e.g., "docusign")
     * @param pageable    pagination information
     * @return a page of event logs for the specified connector
     */
    Page<IntegrationEventLog> findByTenantIdAndConnectorIdOrderByCreatedAtDesc(
            UUID tenantId, String connectorId, Pageable pageable);

    /**
     * Finds all event logs for a specific connector and status in a tenant, ordered by creation date descending.
     *
     * @param tenantId    the tenant ID (required for isolation)
     * @param connectorId the connector ID (e.g., "docusign")
     * @param status      the processing status (SUCCESS, FAILED, or SKIPPED)
     * @param pageable    pagination information
     * @return a page of event logs for the specified connector and status
     */
    Page<IntegrationEventLog> findByTenantIdAndConnectorIdAndStatusOrderByCreatedAtDesc(
            UUID tenantId, String connectorId, String status, Pageable pageable);

    /**
     * Finds all event logs with a specific status for a tenant, ordered by creation date descending.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param status   the processing status (SUCCESS, FAILED, or SKIPPED)
     * @param pageable pagination information
     * @return a page of event logs with the specified status
     */
    Page<IntegrationEventLog> findByTenantIdAndStatusOrderByCreatedAtDesc(
            UUID tenantId, String status, Pageable pageable);

    /**
     * Finds all event logs for a tenant, ordered by creation date descending.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param pageable pagination information
     * @return a page of all event logs for the tenant
     */
    Page<IntegrationEventLog> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    /**
     * Deletes all event logs created before the specified timestamp.
     *
     * <p>Used for implementing data retention policies. For example, to delete
     * logs older than 90 days, calculate the cutoff timestamp and pass it here.</p>
     *
     * @param cutoff the cutoff timestamp; events created before this are deleted
     * @return the number of events deleted
     */
    long deleteByCreatedAtBefore(LocalDateTime cutoff);
}
