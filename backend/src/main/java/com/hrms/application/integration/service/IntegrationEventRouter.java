package com.hrms.application.integration.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.integration.IntegrationConnectorConfigEntity;
import com.hrms.domain.integration.IntegrationEvent;
import com.hrms.domain.kafka.FailedKafkaEvent;
import com.hrms.domain.kafka.FailedKafkaEvent.FailedEventStatus;
import com.hrms.infrastructure.kafka.repository.FailedKafkaEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for routing integration events to configured connectors.
 *
 * <p>Asynchronously routes events to all active connectors subscribed to the event type.
 * Handles tenant isolation, error handling, and event logging. Failed events are
 * published to a Dead Letter Topic (DLT) for manual investigation.</p>
 *
 * <p><strong>NOT a Kafka listener.</strong> This service is called directly from
 * domain event publishers (CRIT-001: event handling through synchronous method calls,
 * not Kafka topic listeners).</p>
 *
 * <p><strong>Asynchronous Processing:</strong> The {@link #routeToConnectors(IntegrationEvent)}
 * method is marked with {@code @Async} to avoid blocking the caller. Ensure that
 * Spring's async support is enabled via {@code @EnableAsync}.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrationEventRouter {

    private final ConnectorRegistry connectorRegistry;
    private final IntegrationConnectorConfigService configService;
    private final IntegrationEventLogService eventLogService;
    private final FailedKafkaEventRepository failedKafkaEventRepository;
    private final ObjectMapper objectMapper;

    /**
     * Asynchronously routes an integration event to all active connectors
     * subscribed to the event type.
     *
     * <p><strong>Execution Model:</strong>
     * <ul>
     *   <li>Runs asynchronously in a background thread (via Spring @Async)</li>
     *   <li>Retrieves all active connector configurations subscribed to the event type</li>
     *   <li>For each matching configuration, delegates to the connector's handleEvent() method</li>
     *   <li>Logs success, failure, or skip status for each processing attempt</li>
     *   <li>On connector failure, publishes the event to the DLT for manual investigation</li>
     *   <li>Maintains tenant isolation via TenantContext (set/cleared in try/finally)</li>
     * </ul>
     *
     * <p><strong>Error Handling:</strong>
     * <ul>
     *   <li>If a connector throws an exception, the error is logged and the event
     *       is published to the DLT via {@link #publishToDlt(IntegrationEvent, String, Exception)}</li>
     *   <li>Other connectors continue processing even if one fails</li>
     *   <li>Tenant context is guaranteed to be cleared after processing (via try/finally)</li>
     * </ul>
     *
     * <p><strong>Logging:</strong>
     * <ul>
     *   <li>Success and failure events are logged via {@link IntegrationEventLogService}</li>
     *   <li>Skipped events (e.g., connector inactive) are also logged</li>
     * </ul>
     *
     * @param event the integration event to route to connectors
     */
    @Async
    public void routeToConnectors(IntegrationEvent event) {
        TenantContext.setCurrentTenant(event.tenantId());
        long startTime = System.currentTimeMillis();

        try {
            log.info("Routing event: type={}, entity={}, entityId={}",
                event.eventType(), event.entityType(), event.entityId());

            // Find all active connectors subscribed to this event type
            List<IntegrationConnectorConfigEntity> activeConfigs =
                configService.findActiveByEventSubscription(event.tenantId(), event.eventType());

            if (activeConfigs.isEmpty()) {
                log.debug("No active connectors subscribed to event type: {}", event.eventType());
                return;
            }

            log.debug("Found {} connectors subscribed to event type: {}",
                activeConfigs.size(), event.eventType());

            // Route event to each active connector
            for (IntegrationConnectorConfigEntity config : activeConfigs) {
                String connectorId = config.getConnectorId();

                try {
                    long connectorStartTime = System.currentTimeMillis();

                    // Get the connector from the registry
                    var connector = connectorRegistry.getConnector(connectorId);

                    // Invoke the connector's event handler
                    connector.handleEvent(event);

                    long durationMs = System.currentTimeMillis() - connectorStartTime;

                    // Log success
                    eventLogService.logSuccess(event, connectorId, durationMs);

                    log.debug("Event processed successfully by connector: {} ({}ms)",
                        connectorId, durationMs);

                } catch (Exception e) {
                    long durationMs = System.currentTimeMillis() - startTime;

                    log.error("Connector {} failed to process event {}: {}",
                        connectorId, event.eventType(), e.getMessage(), e);

                    // Log failure
                    eventLogService.logFailure(event, connectorId, e.getMessage(), durationMs);

                    // Publish to DLT for manual investigation
                    publishToDlt(event, connectorId, e);
                }
            }

        } catch (Exception e) {
            log.error("Unexpected error while routing event {}: {}",
                event.eventType(), e.getMessage(), e);
        } finally {
            // Always clear tenant context
            TenantContext.setCurrentTenant(null);
        }
    }

    /**
     * Stores a failed integration event in the {@code failed_kafka_events} table for
     * admin inspection and replay.
     *
     * <p>CRIT-4 FIX: Previously a no-op. Now persists the event following the same
     * pattern used by {@code DeadLetterHandler.persistIfAbsent()}. The "topic" column
     * is set to {@code "integration-events.dlt"} and targetTopic to
     * {@code "integration-events"} so the admin replay API can route it correctly.</p>
     *
     * @param event       the integration event that failed
     * @param connectorId the connector that failed to process the event
     * @param exception   the exception thrown by the connector
     */
    @Transactional
    void publishToDlt(IntegrationEvent event, String connectorId, Exception exception) {
        log.warn("SEC: Publishing failed integration event to DLT store: eventType={}, connector={}, error={}",
            event.eventType(), connectorId, exception.getMessage());

        try {
            // Serialize the event with connector + error context into a compact JSON payload
            String payload = objectMapper.writeValueAsString(java.util.Map.of(
                "eventType", event.eventType(),
                "entityType", event.entityType() != null ? event.entityType() : "",
                "entityId", event.entityId() != null ? event.entityId().toString() : "",
                "tenantId", event.tenantId() != null ? event.tenantId().toString() : "",
                "connectorId", connectorId,
                "errorMessage", exception.getMessage() != null ? exception.getMessage() : ""
            ));

            boolean truncated = payload.length() > FailedKafkaEvent.MAX_PAYLOAD_LENGTH;
            String storedPayload = truncated
                ? payload.substring(0, FailedKafkaEvent.MAX_PAYLOAD_LENGTH)
                : payload;

            FailedKafkaEvent failedEvent = FailedKafkaEvent.builder()
                .topic("integration-events.dlt")
                .partition(0)
                .offset(-1L)
                .payload(storedPayload)
                .payloadTruncated(truncated)
                .errorMessage(exception.getMessage())
                .status(FailedEventStatus.PENDING_REPLAY)
                .targetTopic("integration-events")
                .replayCount(0)
                .build();

            failedKafkaEventRepository.save(failedEvent);

            log.info("SEC: Failed integration event persisted to DLT store: eventType={}, connector={}",
                event.eventType(), connectorId);

        } catch (Exception persistenceException) {
            // Log but do not rethrow — DLT storage failure must not mask the original error
            log.error("SEC: Failed to persist integration event to DLT store: eventType={}, connector={}, persistenceError={}",
                event.eventType(), connectorId, persistenceException.getMessage(), persistenceException);
        }
    }
}
