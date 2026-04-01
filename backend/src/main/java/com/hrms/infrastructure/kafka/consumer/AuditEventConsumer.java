package com.hrms.infrastructure.kafka.consumer;

import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.IdempotencyService;
import com.hrms.infrastructure.kafka.events.AuditEvent;
import com.hrms.infrastructure.audit.repository.AuditLogRepository;
import com.hrms.domain.audit.AuditLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Kafka consumer for audit events.
 *
 * <p>Listens to the nu-aura.audit topic and asynchronously persists audit trail
 * records to the audit_logs table.
 *
 * Features:
 * - Batch processing for high throughput
 * - Never throws exceptions (logs errors but acknowledges)
 * - Idempotent processing via eventId
 * - Permanent storage of all audit events
 *
 * High throughput design: Audit events should NOT block business operations.
 * If processing fails, we log the error but don't retry, ensuring high availability.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditEventConsumer {

    /**
     * Batch size for persisting audit events.
     */
    private static final int BATCH_SIZE = 50;

    /**
     * Batch accumulator for efficient bulk inserts.
     */
    private final List<AuditEvent> eventBatch = new ArrayList<>(BATCH_SIZE);

    private final IdempotencyService idempotencyService;
    private final AuditLogRepository auditLogRepository;

    /**
     * Handle a single audit event.
     * Events are accumulated and persisted in batches for performance.
     */
    @KafkaListener(
            topics = KafkaTopics.AUDIT,
            groupId = KafkaTopics.GROUP_AUDIT_CONSUMER,
            containerFactory = "auditEventListenerContainerFactory"
    )
    public void handleAuditEvent(
            @Payload AuditEvent event,
            Acknowledgment acknowledgment) {

        String eventId = event.getEventId();

        if (event.getTenantId() != null) {
            TenantContext.setCurrentTenant(event.getTenantId());
        }
        try {
            // Atomic idempotency check-and-claim via Redis SETNX
            if (!idempotencyService.tryProcess(eventId)) {
                log.debug("Audit event {} already processed, skipping", eventId);
                acknowledgment.acknowledge();
                return;
            }

            log.debug("Processing audit event: action={}, entity={}, user={}, tenant={}",
                    event.getAction(), event.getEntityType(), event.getUserId(), event.getTenantId());

            // Add to batch; persist and ACK only after successful DB write
            synchronized (eventBatch) {
                eventBatch.add(event);

                // Persist batch if size reached, then ACK all events in the batch
                if (eventBatch.size() >= BATCH_SIZE) {
                    persistAuditBatch(eventBatch);
                    eventBatch.clear();
                }
            }

            // ACK after persist — if JVM crashes before this line, Kafka will redeliver
            acknowledgment.acknowledge();

        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            // Log error but don't throw; audit events should never block business operations
            log.error("Error processing audit event {}: {}", eventId, e.getMessage(), e);
            // Do NOT acknowledge on failure — Kafka will redeliver after consumer restart
            // This prevents data loss at the cost of potential reprocessing (idempotency handles dedup)
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Persist a batch of audit events to the database.
     * This uses bulk insert for efficiency.
     */
    private void persistAuditBatch(List<AuditEvent> batch) {
        try {
            log.info("Persisting batch of {} audit events", batch.size());

            // Convert AuditEvent messages to AuditLog domain objects and persist
            List<AuditLog> auditLogs = new ArrayList<>();
            for (AuditEvent event : batch) {
                AuditLog auditLog = AuditLog.builder()
                        .tenantId(event.getTenantId())
                        .entityType(event.getEntityType())
                        .entityId(event.getEntityId())
                        .action(AuditLog.AuditAction.valueOf(event.getAction()))
                        .actorId(event.getUserId())
                        .description(event.getDescription())
                        .changes(event.getOldValue() != null || event.getNewValue() != null
                                ? "old=" + event.getOldValue() + ", new=" + event.getNewValue()
                                : null)
                        .ipAddress(event.getIpAddress())
                        .userAgent(event.getUserAgent())
                        .build();
                auditLog.setId(UUID.fromString(event.getEventId()));
                auditLogs.add(auditLog);
            }

            // Batch save all audit logs
            auditLogRepository.saveAll(auditLogs);

            log.debug("Successfully persisted {} audit events", batch.size());

        } catch (DataAccessException e) {
            // Log error but don't throw
            log.error("Failed to persist audit batch (size={}): {}", batch.size(), e.getMessage(), e);
            // In production, you might want to:
            // - Send alert to monitoring system
            // - Attempt to persist individually for partial recovery
            // But never re-throw to avoid blocking the consumer
        }
    }

    /**
     * Flush any remaining events in the batch on shutdown.
     * Called by Spring during graceful shutdown via @PreDestroy.
     */
    @PreDestroy
    public void flushPendingEvents() {
        synchronized (eventBatch) {
            if (!eventBatch.isEmpty()) {
                log.info("Flushing {} pending audit events on shutdown", eventBatch.size());
                try {
                    persistAuditBatch(eventBatch);
                    eventBatch.clear();
                } catch (DataAccessException e) {
                    log.error("Failed to flush pending audit events: {}", e.getMessage(), e);
                }
            }
        }
    }
}
