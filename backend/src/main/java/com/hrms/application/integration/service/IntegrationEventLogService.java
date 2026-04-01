package com.hrms.application.integration.service;

import com.hrms.domain.integration.IntegrationEvent;
import com.hrms.domain.integration.IntegrationEventLog;
import com.hrms.infrastructure.integration.repository.IntegrationEventLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Map;

/**
 * Service for managing integration event logs.
 *
 * <p>Handles logging of successful, failed, and skipped event processing.
 * Provides query methods for retrieving event history and cleanup operations
 * for data retention policies.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IntegrationEventLogService {

    private final IntegrationEventLogRepository repository;
    private final ObjectMapper objectMapper;

    /**
     * Logs a successful event processing.
     *
     * <p>Records that the event was successfully processed by the connector,
     * including the duration of processing.</p>
     *
     * @param event the integration event that was processed
     * @param connectorId the ID of the connector that processed the event
     * @param durationMs the time taken to process the event, in milliseconds
     */
    @Transactional
    public void logSuccess(IntegrationEvent event, String connectorId, long durationMs) {
        log.debug("Logging successful event processing: event={}, connector={}, duration={}ms",
            event.eventType(), connectorId, durationMs);

        IntegrationEventLog logEntry = IntegrationEventLog.builder()
            .tenantId(event.tenantId())
            .connectorId(connectorId)
            .eventType(event.eventType())
            .entityType(event.entityType())
            .entityId(event.entityId())
            .status("SUCCESS")
            .durationMs((int) durationMs)
            .metadataJson(serializeMetadata(event.metadata()))
            .build();

        repository.save(logEntry);
    }

    /**
     * Logs a failed event processing.
     *
     * <p>Records that the event processing failed, including the error message
     * and the duration of the failed attempt.</p>
     *
     * @param event the integration event that failed to process
     * @param connectorId the ID of the connector that attempted to process the event
     * @param errorMessage a description of the failure
     * @param durationMs the time taken before the failure, in milliseconds
     */
    @Transactional
    public void logFailure(IntegrationEvent event, String connectorId, String errorMessage, long durationMs) {
        log.warn("Logging failed event processing: event={}, connector={}, error={}",
            event.eventType(), connectorId, errorMessage);

        IntegrationEventLog logEntry = IntegrationEventLog.builder()
            .tenantId(event.tenantId())
            .connectorId(connectorId)
            .eventType(event.eventType())
            .entityType(event.entityType())
            .entityId(event.entityId())
            .status("FAILED")
            .errorMessage(errorMessage)
            .durationMs((int) durationMs)
            .metadataJson(serializeMetadata(event.metadata()))
            .build();

        repository.save(logEntry);
    }

    /**
     * Logs a skipped event processing.
     *
     * <p>Records that the event was skipped (e.g., connector not subscribed,
     * connector inactive, etc.), along with the reason for skipping.</p>
     *
     * @param event the integration event that was skipped
     * @param connectorId the ID of the connector that skipped the event
     * @param reason a description of why the event was skipped
     */
    @Transactional
    public void logSkipped(IntegrationEvent event, String connectorId, String reason) {
        log.debug("Logging skipped event processing: event={}, connector={}, reason={}",
            event.eventType(), connectorId, reason);

        IntegrationEventLog logEntry = IntegrationEventLog.builder()
            .tenantId(event.tenantId())
            .connectorId(connectorId)
            .eventType(event.eventType())
            .entityType(event.entityType())
            .entityId(event.entityId())
            .status("SKIPPED")
            .errorMessage(reason)
            .metadataJson(serializeMetadata(event.metadata()))
            .build();

        repository.save(logEntry);
    }

    /**
     * Retrieves event logs for a specific connector in a tenant.
     *
     * <p>Optionally filters by status. Results are ordered by creation date (newest first).</p>
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param connectorId the connector ID to filter by (optional; if null, all connectors are included)
     * @param status the processing status to filter by (SUCCESS, FAILED, SKIPPED; if null, all statuses are included)
     * @param pageable pagination information
     * @return a page of event logs matching the criteria
     */
    @Transactional(readOnly = true)
    public Page<IntegrationEventLog> getEvents(UUID tenantId, String connectorId, String status, Pageable pageable) {
        log.debug("Retrieving event logs: tenant={}, connector={}, status={}", tenantId, connectorId, status);

        if (connectorId != null && status != null) {
            // Filter by both connector and status
            return repository.findByTenantIdAndConnectorIdAndStatusOrderByCreatedAtDesc(tenantId, connectorId, status, pageable);
        } else if (connectorId != null) {
            // Filter by connector only
            return repository.findByTenantIdAndConnectorIdOrderByCreatedAtDesc(tenantId, connectorId, pageable);
        } else if (status != null) {
            // Filter by status only
            return repository.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, status, pageable);
        } else {
            // No filters
            return repository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        }
    }

    /**
     * Deletes event logs older than the specified retention period.
     *
     * <p>This method is intended to be called by scheduled cleanup jobs.
     * For example, to delete logs older than 90 days:
     * <code>cleanupOldEvents(90)</code></p>
     *
     * <p><strong>Thread Safety:</strong> This operation is transactional and safe
     * to call concurrently, but should typically be scheduled at low-traffic times.</p>
     *
     * @param retentionDays the number of days to retain logs; older logs are deleted
     * @return the number of logs deleted
     */
    @Transactional
    public long cleanupOldEvents(int retentionDays) {
        log.info("Cleaning up integration event logs older than {} days", retentionDays);

        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        long deletedCount = repository.deleteByCreatedAtBefore(cutoff);

        log.info("Deleted {} integration event logs", deletedCount);
        return deletedCount;
    }

    /**
     * Serializes event metadata to JSON.
     *
     * <p>If serialization fails, logs a warning and returns an empty JSON object.</p>
     *
     * @param metadata the metadata map to serialize
     * @return the JSON string representation, or "{}" if serialization fails
     */
    private String serializeMetadata(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception e) { // Intentional broad catch — per-event integration error boundary
            log.warn("Failed to serialize event metadata", e);
            return "{}";
        }
    }
}
