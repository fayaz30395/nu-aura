package com.hrms.infrastructure.kafka.consumer;

import com.hrms.application.notification.dto.NotificationMessage;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.application.payroll.service.PayrollRunService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.infrastructure.kafka.IdempotencyService;
import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.events.PayrollProcessingEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Kafka consumer for async payroll processing events.
 *
 * <p>Listens to {@code nu-aura.payroll-processing} and executes the
 * per-employee payroll computation that was previously done synchronously
 * inside the HTTP request. The run is already in {@code PROCESSING} status
 * when this consumer picks up the event.</p>
 *
 * <p>On success the run transitions to {@code PROCESSED} and the triggering
 * user receives a WebSocket notification. On failure the run is rolled back
 * to {@code DRAFT} so it can be resubmitted, and an error WebSocket
 * notification is sent to the triggering user.</p>
 *
 * <p>Idempotency: each event is keyed by {@code eventId} in Redis (24-hour
 * TTL). Duplicate deliveries (Kafka at-least-once) are safely skipped.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollProcessingConsumer {

    private final IdempotencyService idempotencyService;
    private final PayrollRunService payrollRunService;
    private final WebSocketNotificationService webSocketNotificationService;

    @KafkaListener(
            topics = KafkaTopics.PAYROLL_PROCESSING,
            groupId = KafkaTopics.GROUP_PAYROLL_PROCESSING_CONSUMER,
            containerFactory = "payrollProcessingEventListenerContainerFactory"
    )
    public void handlePayrollProcessingEvent(
            @Payload PayrollProcessingEvent event,
            Acknowledgment acknowledgment,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        String eventId = event.getEventId();
        UUID runId = event.getRunId();
        UUID tenantId = event.getTenantId();
        UUID triggeredBy = event.getTriggeredBy();

        log.info("Received payroll processing event: eventId={}, runId={}, period={}/{}, tenantId={}, topic={}, partition={}, offset={}",
                eventId, runId, event.getPayPeriodYear(), event.getPayPeriodMonth(),
                tenantId, topic, partition, offset);

        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }

        try {
            // Atomic idempotency check-and-claim via Redis SETNX
            if (!idempotencyService.tryProcess(eventId)) {
                log.debug("Payroll processing event {} already processed, skipping", eventId);
                acknowledgment.acknowledge();
                return;
            }

            processPayrollRun(runId, triggeredBy, event);

            acknowledgment.acknowledge();
            log.info("Successfully completed async payroll processing for run {}", runId);

        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            log.error("Unrecoverable error processing payroll run {}: {}", runId, e.getMessage(), e);

            // Roll the run back to DRAFT so it can be resubmitted
            rollbackToDraft(runId, triggeredBy, e);

            // Do not acknowledge — let Kafka retry / DLT per container error-handler config
            throw e;
        } finally {
            TenantContext.clear();
        }
    }

    // ============ Private helpers ============

    /**
     * Execute the payroll computation in batches and finalise the run.
     */
    private void processPayrollRun(UUID runId, UUID triggeredBy, PayrollProcessingEvent event) {
        log.info("Starting payroll computation for run {}, period={}/{}",
                runId, event.getPayPeriodYear(), event.getPayPeriodMonth());

        // Delegate the actual per-employee computation to PayrollRunService.
        // The service uses the existing SpEL-based formula engine and runs inside a DB transaction.
        PayrollRun processed = payrollRunService.completeProcessing(runId, triggeredBy);

        log.info("Payroll computation finished for run {} — status={}, employees={}",
                runId, processed.getStatus(), processed.getTotalEmployees());

        // Notify the triggering user via WebSocket
        sendSuccessNotification(triggeredBy, processed);
    }

    /**
     * Roll back the run to DRAFT on unrecoverable failure and notify the user.
     */
    private void rollbackToDraft(UUID runId, UUID triggeredBy, Exception cause) {
        try {
            payrollRunService.failProcessing(runId);
            log.info("Rolled payroll run {} back to DRAFT after processing failure", runId);
        } catch (Exception rollbackEx) { // Intentional broad catch — per-message error boundary
            log.error("Failed to roll back payroll run {} to DRAFT: {}", runId, rollbackEx.getMessage(), rollbackEx);
        }

        if (triggeredBy != null) {
            try {
                NotificationMessage notification = NotificationMessage.builder()
                        .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                        .title("Payroll Processing Failed")
                        .message("Payroll run processing failed and has been reset to DRAFT. "
                                + "Please review the issue and resubmit. Error: "
                                + cause.getMessage())
                        .priority(NotificationMessage.Priority.URGENT)
                        .actionUrl("/payroll/runs")
                        .build();

                webSocketNotificationService.sendToUser(triggeredBy, notification);
            } catch (Exception notifEx) { // Intentional broad catch — per-message error boundary
                log.warn("Failed to send failure WebSocket notification to user {}: {}",
                        triggeredBy, notifEx.getMessage());
            }
        }
    }

    /**
     * Send a success WebSocket notification to the user who triggered processing.
     */
    private void sendSuccessNotification(UUID triggeredBy, PayrollRun run) {
        if (triggeredBy == null) {
            return;
        }
        try {
            String period = run.getPayPeriodMonth() + "/" + run.getPayPeriodYear();
            NotificationMessage notification = NotificationMessage.builder()
                    .type(NotificationMessage.NotificationType.PAYROLL_PROCESSED)
                    .title("Payroll Processing Complete")
                    .message(String.format(
                            "Payroll run for %s has been processed successfully. "
                                    + "Total employees: %s.",
                            period,
                            run.getTotalEmployees() != null ? run.getTotalEmployees() : "N/A"))
                    .priority(NotificationMessage.Priority.HIGH)
                    .actionUrl("/payroll/runs/" + run.getId())
                    .build();

            webSocketNotificationService.sendToUser(triggeredBy, notification);
        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            log.warn("Failed to send success WebSocket notification to user {}: {}",
                    triggeredBy, e.getMessage());
        }
    }
}
