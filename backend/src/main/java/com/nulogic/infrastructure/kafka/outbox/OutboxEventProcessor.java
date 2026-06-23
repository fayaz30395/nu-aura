package com.nulogic.infrastructure.kafka.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.kafka.KafkaTopics;
import com.nulogic.infrastructure.kafka.consumer.*;
import com.nulogic.infrastructure.kafka.events.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Polls the outbox_events table and dispatches pending events to the appropriate
 * consumer's process() method. This makes event processing durable on Railway
 * where no Kafka is provisioned — events survive app restarts since they live in PostgreSQL.
 *
 * <p>Enabled by default (app.outbox.enabled=true). Has its own @EnableScheduling
 * so it works even when app.scheduling.enabled=false disables the main scheduler.</p>
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.outbox.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxEventProcessor {

    // Separate @Configuration that enables scheduling for the outbox independently
    // of SchedulingConfig (which is gated by app.scheduling.enabled).
    @Configuration
    @EnableScheduling
    @ConditionalOnProperty(name = "app.outbox.enabled", havingValue = "true", matchIfMissing = true)
    static class OutboxSchedulingConfig {}

    private static final int MAX_RETRIES = 5;

    // Self-reference (lazy to avoid a circular bean dependency) so pollAndProcess
    // invokes processOneEvent THROUGH the Spring proxy. Without this, the
    // self-invocation would bypass the proxy and silently drop the
    // @Transactional(REQUIRES_NEW) — meaning the SKIP LOCKED row lock would not be
    // held across dispatch, defeating the multi-pod safety guarantee.
    private final OutboxEventProcessor self;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final NotificationEventConsumer notificationEventConsumer;
    private final ApprovalEventConsumer approvalEventConsumer;
    private final AuditEventConsumer auditEventConsumer;
    private final EmployeeLifecycleConsumer employeeLifecycleConsumer;
    private final PayrollProcessingConsumer payrollProcessingConsumer;
    private final Optional<FluenceSearchConsumer> fluenceSearchConsumer;

    private static final Map<String, Class<? extends BaseKafkaEvent>> TOPIC_EVENT_CLASSES = Map.of(
            KafkaTopics.NOTIFICATIONS, NotificationEvent.class,
            KafkaTopics.APPROVALS, ApprovalEvent.class,
            KafkaTopics.AUDIT, AuditEvent.class,
            KafkaTopics.EMPLOYEE_LIFECYCLE, EmployeeLifecycleEvent.class,
            KafkaTopics.PAYROLL_PROCESSING, PayrollProcessingEvent.class,
            KafkaTopics.FLUENCE_CONTENT, FluenceContentEvent.class
    );

    public OutboxEventProcessor(
            @Lazy OutboxEventProcessor self,
            OutboxEventRepository outboxEventRepository,
            ObjectMapper objectMapper,
            NotificationEventConsumer notificationEventConsumer,
            ApprovalEventConsumer approvalEventConsumer,
            AuditEventConsumer auditEventConsumer,
            EmployeeLifecycleConsumer employeeLifecycleConsumer,
            PayrollProcessingConsumer payrollProcessingConsumer,
            Optional<FluenceSearchConsumer> fluenceSearchConsumer) {
        this.self = self;
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
        this.notificationEventConsumer = notificationEventConsumer;
        this.approvalEventConsumer = approvalEventConsumer;
        this.auditEventConsumer = auditEventConsumer;
        this.employeeLifecycleConsumer = employeeLifecycleConsumer;
        this.payrollProcessingConsumer = payrollProcessingConsumer;
        this.fluenceSearchConsumer = fluenceSearchConsumer;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:5000}")
    public void pollAndProcess() {
        List<OutboxEvent> pending = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        if (pending.isEmpty()) {
            return;
        }
        log.debug("Outbox: processing {} candidate events", pending.size());
        for (OutboxEvent outboxEvent : pending) {
            // Go through the proxy (self) so REQUIRES_NEW + the row lock apply.
            self.processOneEvent(outboxEvent.getId());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processOneEvent(UUID outboxEventId) {
        // Re-fetch under FOR UPDATE SKIP LOCKED: if another poller instance already
        // holds this row (or already moved it out of PENDING), skip it so the event
        // is dispatched exactly once across all pods.
        Optional<OutboxEvent> locked = outboxEventRepository.lockPendingById(outboxEventId);
        if (locked.isEmpty()) {
            return;
        }
        OutboxEvent outboxEvent = locked.get();
        UUID tenantId = outboxEvent.getTenantId();
        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }
        try {
            dispatch(outboxEvent);
            outboxEvent.setStatus("PROCESSED");
            outboxEvent.setProcessedAt(Instant.now());
            outboxEventRepository.save(outboxEvent);
        } catch (Exception e) {
            log.error("Outbox dispatch failed for event {} (topic={}, retry={}): {}",
                    outboxEvent.getEventId(), outboxEvent.getTopic(), outboxEvent.getRetryCount(), e.getMessage(), e);
            int nextRetry = outboxEvent.getRetryCount() + 1;
            if (nextRetry >= MAX_RETRIES) {
                outboxEventRepository.markFailed(outboxEvent.getId(),
                        truncate(e.getMessage(), 1000));
                log.warn("Outbox event {} moved to FAILED after {} retries", outboxEvent.getEventId(), nextRetry);
            } else {
                outboxEvent.setRetryCount(nextRetry);
                outboxEvent.setLastError(truncate(e.getMessage(), 1000));
                outboxEventRepository.save(outboxEvent);
            }
        } finally {
            TenantContext.clear();
        }
    }

    private void dispatch(OutboxEvent outboxEvent) throws Exception {
        String topic = outboxEvent.getTopic();
        Class<? extends BaseKafkaEvent> eventClass = TOPIC_EVENT_CLASSES.get(topic);
        if (eventClass == null) {
            log.warn("Outbox: unknown topic '{}', skipping event {}", topic, outboxEvent.getEventId());
            return;
        }

        BaseKafkaEvent event = objectMapper.readValue(outboxEvent.getPayload(), eventClass);

        switch (topic) {
            case KafkaTopics.NOTIFICATIONS ->
                    notificationEventConsumer.process((NotificationEvent) event);
            case KafkaTopics.APPROVALS ->
                    approvalEventConsumer.process((ApprovalEvent) event);
            case KafkaTopics.AUDIT ->
                    auditEventConsumer.process((AuditEvent) event);
            case KafkaTopics.EMPLOYEE_LIFECYCLE ->
                    employeeLifecycleConsumer.process((EmployeeLifecycleEvent) event);
            case KafkaTopics.PAYROLL_PROCESSING ->
                    payrollProcessingConsumer.process((PayrollProcessingEvent) event);
            case KafkaTopics.FLUENCE_CONTENT -> {
                if (fluenceSearchConsumer.isPresent()) {
                    fluenceSearchConsumer.get().process((FluenceContentEvent) event);
                } else {
                    log.debug("Outbox: FluenceSearchConsumer not active (Elasticsearch disabled), skipping event {}",
                            outboxEvent.getEventId());
                    // Mark as PROCESSED so it doesn't pile up indefinitely
                    outboxEvent.setStatus("PROCESSED");
                }
            }
            default -> log.warn("Outbox: no handler registered for topic '{}', event {}", topic, outboxEvent.getEventId());
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
