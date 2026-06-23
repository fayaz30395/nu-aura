package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.application.notification.dto.NotificationMessage;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.application.payroll.service.PayrollRunService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.events.PayrollProcessingEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link PayrollProcessingConsumer#process(PayrollProcessingEvent)}.
 *
 * <p>Branches covered:
 * <ul>
 *   <li>idempotency duplicate skip</li>
 *   <li>happy path: completeProcessing + success WebSocket notification</li>
 *   <li>success notification skipped when triggeredBy is null</li>
 *   <li>failure path: release claim, rollback to DRAFT, failure notification, re-throw</li>
 *   <li>failure path with null triggeredBy: rollback but no notification</li>
 *   <li>rollback (failProcessing) itself throwing is swallowed; original error still re-thrown</li>
 *   <li>notification-send failures are swallowed (success and failure paths)</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class PayrollProcessingConsumerTest {

    @Mock
    private IdempotencyService idempotencyService;
    @Mock
    private PayrollRunService payrollRunService;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    @InjectMocks
    private PayrollProcessingConsumer consumer;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private PayrollProcessingEvent event(UUID runId, UUID triggeredBy) {
        PayrollProcessingEvent e = new PayrollProcessingEvent();
        e.setEventId(UUID.randomUUID().toString());
        e.setTenantId(UUID.randomUUID());
        e.setRunId(runId);
        e.setTriggeredBy(triggeredBy);
        e.setPayPeriodMonth(6);
        e.setPayPeriodYear(2026);
        return e;
    }

    private PayrollRun processedRun(UUID runId) {
        PayrollRun run = mock(PayrollRun.class);
        lenient().when(run.getId()).thenReturn(runId);
        lenient().when(run.getPayPeriodMonth()).thenReturn(6);
        lenient().when(run.getPayPeriodYear()).thenReturn(2026);
        lenient().when(run.getTotalEmployees()).thenReturn(42);
        return run;
    }

    @Test
    @DisplayName("process skips when event already processed")
    void process_duplicate_skips() {
        PayrollProcessingEvent e = event(UUID.randomUUID(), UUID.randomUUID());
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(false);

        consumer.process(e);

        verifyNoInteractions(payrollRunService, webSocketNotificationService);
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("happy path completes processing and sends a success notification")
    void process_happyPath_completesAndNotifies() {
        UUID runId = UUID.randomUUID();
        UUID triggeredBy = UUID.randomUUID();
        PayrollProcessingEvent e = event(runId, triggeredBy);
        PayrollRun run = processedRun(runId);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(payrollRunService.completeProcessing(runId, triggeredBy)).thenReturn(run);

        consumer.process(e);

        verify(payrollRunService).completeProcessing(runId, triggeredBy);
        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(webSocketNotificationService).sendToUser(eq(triggeredBy), captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(NotificationMessage.NotificationType.PAYROLL_PROCESSED);
        assertThat(captor.getValue().getPriority()).isEqualTo(NotificationMessage.Priority.HIGH);
        verify(payrollRunService, never()).failProcessing(any());
        verify(idempotencyService, never()).release(any());
    }

    @Test
    @DisplayName("happy path with null triggeredBy completes but sends no notification")
    void process_happyPath_nullTriggeredBy_noNotification() {
        UUID runId = UUID.randomUUID();
        PayrollProcessingEvent e = event(runId, null);
        PayrollRun run = processedRun(runId);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(payrollRunService.completeProcessing(runId, null)).thenReturn(run);

        consumer.process(e);

        verify(payrollRunService).completeProcessing(runId, null);
        verifyNoInteractions(webSocketNotificationService);
    }

    @Test
    @DisplayName("processing failure releases claim, rolls back to DRAFT, notifies, and re-throws")
    void process_failure_rollsBackNotifiesAndThrows() {
        UUID runId = UUID.randomUUID();
        UUID triggeredBy = UUID.randomUUID();
        PayrollProcessingEvent e = event(runId, triggeredBy);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(payrollRunService.completeProcessing(runId, triggeredBy))
                .thenThrow(new RuntimeException("formula engine error"));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(idempotencyService).release(e.getEventId());
        verify(payrollRunService).failProcessing(runId);
        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(webSocketNotificationService).sendToUser(eq(triggeredBy), captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(NotificationMessage.NotificationType.SYSTEM_ALERT);
        assertThat(captor.getValue().getPriority()).isEqualTo(NotificationMessage.Priority.URGENT);
    }

    @Test
    @DisplayName("processing failure with null triggeredBy rolls back but sends no notification")
    void process_failure_nullTriggeredBy_noNotification() {
        UUID runId = UUID.randomUUID();
        PayrollProcessingEvent e = event(runId, null);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(payrollRunService.completeProcessing(runId, null))
                .thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> consumer.process(e)).isInstanceOf(RuntimeException.class);

        verify(payrollRunService).failProcessing(runId);
        verifyNoInteractions(webSocketNotificationService);
    }

    @Test
    @DisplayName("rollback (failProcessing) throwing is swallowed; original error still re-thrown")
    void process_rollbackFailure_swallowedButStillThrows() {
        UUID runId = UUID.randomUUID();
        UUID triggeredBy = UUID.randomUUID();
        PayrollProcessingEvent e = event(runId, triggeredBy);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(payrollRunService.completeProcessing(runId, triggeredBy))
                .thenThrow(new RuntimeException("primary failure"));
        org.mockito.Mockito.doThrow(new RuntimeException("rollback failed"))
                .when(payrollRunService).failProcessing(runId);

        assertThatThrownBy(() -> consumer.process(e))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("primary failure");

        // Failure notification is still attempted after the swallowed rollback error.
        verify(webSocketNotificationService).sendToUser(eq(triggeredBy), any());
    }

    @Test
    @DisplayName("failure-notification send error is swallowed; original error still re-thrown")
    void process_failureNotificationThrows_swallowed() {
        UUID runId = UUID.randomUUID();
        UUID triggeredBy = UUID.randomUUID();
        PayrollProcessingEvent e = event(runId, triggeredBy);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(payrollRunService.completeProcessing(runId, triggeredBy))
                .thenThrow(new RuntimeException("primary failure"));
        org.mockito.Mockito.doThrow(new RuntimeException("ws down"))
                .when(webSocketNotificationService).sendToUser(eq(triggeredBy), any());

        assertThatThrownBy(() -> consumer.process(e))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("primary failure");

        verify(payrollRunService).failProcessing(runId);
    }

    @Test
    @DisplayName("success-notification send error is swallowed; processing still succeeds")
    void process_successNotificationThrows_swallowed() {
        UUID runId = UUID.randomUUID();
        UUID triggeredBy = UUID.randomUUID();
        PayrollProcessingEvent e = event(runId, triggeredBy);
        PayrollRun run = processedRun(runId);
        when(idempotencyService.tryProcess(e.getEventId())).thenReturn(true);
        when(payrollRunService.completeProcessing(runId, triggeredBy)).thenReturn(run);
        org.mockito.Mockito.doThrow(new RuntimeException("ws down"))
                .when(webSocketNotificationService).sendToUser(eq(triggeredBy), any());

        consumer.process(e);

        // Notification failure does not trigger rollback or release.
        verify(payrollRunService, never()).failProcessing(any());
        verify(idempotencyService, never()).release(any());
    }
}
