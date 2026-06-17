package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.audit.AuditLog;
import com.nulogic.infrastructure.audit.repository.AuditLogRepository;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.KafkaTopics;
import com.nulogic.infrastructure.kafka.events.AuditEvent;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Kafka consumer for audit events.
 *
 * <p>Listens to the nu-aura.audit topic and asynchronously persists audit trail
 * records to the audit_logs table.
 * <p>
 * Features:
 * - Batch processing for high throughput
 * - Never throws exceptions (logs errors but acknowledges)
 * - Idempotent processing via eventId
 * - Permanent storage of all audit events
 * <p>
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
     * Batch accumulator for efficient bulk inserts. Each entry carries its
     * Kafka {@link Acknowledgment} so offsets are committed ONLY after the
     * batch has been durably persisted to PostgreSQL (P1-1).
     */
    private final List<PendingAuditEvent> eventBatch = new ArrayList<>(BATCH_SIZE);

    private final IdempotencyService idempotencyService;
    private final AuditLogRepository auditLogRepository;

    /**
     * Called from OutboxEventProcessor — direct single-insert, bypassing the Kafka batch.
     * TenantContext must be set by the caller. Never throws — audit must not block business ops.
     */
    public void process(AuditEvent event) {
        String eventId = event.getEventId();
        if (!idempotencyService.tryProcess(eventId)) {
            log.debug("Audit event {} already processed, skipping", eventId);
            return;
        }
        try {
            AuditLog auditLog = mapToAuditLog(event);
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            idempotencyService.release(eventId);
            log.error("Failed to persist audit event {}: {}", eventId, e.getMessage(), e);
            // Intentionally not re-throwing — audit must not block business operations
        }
    }

    /**
     * Handle a single audit event.
     * Events are accumulated and persisted in batches for performance.
     *
     * <p>Ordering guarantee (P1-1): the offset is acknowledged only AFTER the
     * containing batch has been written to the database. The idempotency claim
     * is also taken at persist time (not consume time), so a JVM crash before
     * persist leaves neither a committed offset nor a Redis claim behind —
     * Kafka redelivery fully reprocesses the lost events.</p>
     */
    @KafkaListener(
            topics = KafkaTopics.AUDIT,
            groupId = KafkaTopics.GROUP_AUDIT_CONSUMER,
            containerFactory = "auditEventListenerContainerFactory"
    )
    public void handleAuditEvent(
            @Payload AuditEvent event,
            Acknowledgment acknowledgment) {

        try {
            log.debug("Buffering audit event: action={}, entity={}, user={}, tenant={}",
                    event.getAction(), event.getEntityType(), event.getUserId(), event.getTenantId());

            // Buffer the event together with its acknowledgment.
            // Persist + ACK happen together once the batch is full.
            synchronized (eventBatch) {
                eventBatch.add(new PendingAuditEvent(event, acknowledgment));

                if (eventBatch.size() >= BATCH_SIZE) {
                    flushBatchLocked();
                }
            }

        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            // Log error but don't throw; audit events should never block business operations
            log.error("Error buffering audit event {}: {}", event.getEventId(), e.getMessage(), e);
            // Do NOT acknowledge on failure — Kafka will redeliver after consumer restart
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Persist the buffered batch and, on success, acknowledge all offsets.
     * Must be called while holding the {@code eventBatch} monitor.
     *
     * <p>On persist failure the batch is retained (and any idempotency claims
     * taken during the attempt are released) so the next event arrival or the
     * shutdown flush retries — no offset is committed for unpersisted data.</p>
     */
    private void flushBatchLocked() {
        if (eventBatch.isEmpty()) {
            return;
        }

        // Claim idempotency at persist time; duplicates (Kafka at-least-once
        // redelivery already persisted by another instance) are ACKed but not re-inserted.
        List<PendingAuditEvent> toPersist = new ArrayList<>(eventBatch.size());
        List<String> claimedEventIds = new ArrayList<>(eventBatch.size());
        for (PendingAuditEvent pending : eventBatch) {
            String eventId = pending.event().getEventId();
            if (idempotencyService.tryProcess(eventId)) {
                toPersist.add(pending);
                claimedEventIds.add(eventId);
            } else {
                log.debug("Audit event {} already processed, skipping persist", eventId);
            }
        }

        if (persistAuditBatch(toPersist)) {
            // ACK after persist — if JVM crashes before this line, Kafka redelivers
            // and the (released-on-failure / absent) idempotency claims allow reprocessing.
            for (PendingAuditEvent pending : eventBatch) {
                pending.acknowledgment().acknowledge();
            }
            eventBatch.clear();
        } else {
            // Persist failed: release claims so the retry is not silently swallowed,
            // keep the batch for the next flush attempt, and commit no offsets.
            claimedEventIds.forEach(idempotencyService::release);
        }
    }

    /**
     * Map a single AuditEvent to an AuditLog domain object.
     */
    private AuditLog mapToAuditLog(AuditEvent event) {
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
        return auditLog;
    }

    /**
     * Persist a batch of audit events to the database.
     * This uses bulk insert for efficiency.
     *
     * @return true if the batch was persisted (or was empty); false on failure
     */
    private boolean persistAuditBatch(List<PendingAuditEvent> batch) {
        if (batch.isEmpty()) {
            return true;
        }
        try {
            log.info("Persisting batch of {} audit events", batch.size());

            List<AuditLog> auditLogs = new ArrayList<>();
            for (PendingAuditEvent pending : batch) {
                auditLogs.add(mapToAuditLog(pending.event()));
            }

            auditLogRepository.saveAll(auditLogs);

            log.debug("Successfully persisted {} audit events", batch.size());
            return true;

        } catch (DataAccessException e) {
            log.error("Failed to persist audit batch (size={}): {}", batch.size(), e.getMessage(), e);
            return false;
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
                flushBatchLocked();
            }
        }
    }

    /**
     * An audit event awaiting batch persistence, paired with the Kafka
     * acknowledgment that must only be invoked after the DB write succeeds.
     */
    private record PendingAuditEvent(AuditEvent event, Acknowledgment acknowledgment) {
    }
}
