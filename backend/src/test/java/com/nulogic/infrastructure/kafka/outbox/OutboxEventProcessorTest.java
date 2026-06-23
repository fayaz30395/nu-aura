package com.nulogic.infrastructure.kafka.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.kafka.KafkaTopics;
import com.nulogic.infrastructure.kafka.consumer.ApprovalEventConsumer;
import com.nulogic.infrastructure.kafka.consumer.AuditEventConsumer;
import com.nulogic.infrastructure.kafka.consumer.EmployeeLifecycleConsumer;
import com.nulogic.infrastructure.kafka.consumer.FluenceSearchConsumer;
import com.nulogic.infrastructure.kafka.consumer.NotificationEventConsumer;
import com.nulogic.infrastructure.kafka.consumer.PayrollProcessingConsumer;
import com.nulogic.infrastructure.kafka.events.ApprovalEvent;
import com.nulogic.infrastructure.kafka.events.AuditEvent;
import com.nulogic.infrastructure.kafka.events.EmployeeLifecycleEvent;
import com.nulogic.infrastructure.kafka.events.FluenceContentEvent;
import com.nulogic.infrastructure.kafka.events.NotificationEvent;
import com.nulogic.infrastructure.kafka.events.PayrollProcessingEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link OutboxEventProcessor}.
 *
 * <p>The {@link ObjectMapper#readValue(String, Class)} call is stubbed so payloads
 * can stay minimal — these tests exercise the dispatch/retry/tenant branches, not
 * JSON binding. {@code lockPendingById} returning Optional is mocked directly; the
 * actual {@code FOR UPDATE SKIP LOCKED} semantics are integration-level only (noted
 * at the bottom of the class).</p>
 */
class OutboxEventProcessorTest {

    private static final String PAYLOAD = "{\"event_id\":\"e1\"}";

    private OutboxEventProcessor self;
    private OutboxEventRepository repository;
    private ObjectMapper objectMapper;
    private NotificationEventConsumer notificationConsumer;
    private ApprovalEventConsumer approvalConsumer;
    private AuditEventConsumer auditConsumer;
    private EmployeeLifecycleConsumer employeeLifecycleConsumer;
    private PayrollProcessingConsumer payrollConsumer;
    private FluenceSearchConsumer fluenceConsumer;

    private OutboxEventProcessor processor;

    @BeforeEach
    void setUp() {
        self = mock(OutboxEventProcessor.class);
        repository = mock(OutboxEventRepository.class);
        objectMapper = mock(ObjectMapper.class);
        notificationConsumer = mock(NotificationEventConsumer.class);
        approvalConsumer = mock(ApprovalEventConsumer.class);
        auditConsumer = mock(AuditEventConsumer.class);
        employeeLifecycleConsumer = mock(EmployeeLifecycleConsumer.class);
        payrollConsumer = mock(PayrollProcessingConsumer.class);
        fluenceConsumer = mock(FluenceSearchConsumer.class);

        processor = newProcessor(Optional.of(fluenceConsumer));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private OutboxEventProcessor newProcessor(Optional<FluenceSearchConsumer> fluence) {
        return new OutboxEventProcessor(
                self,
                repository,
                objectMapper,
                notificationConsumer,
                approvalConsumer,
                auditConsumer,
                employeeLifecycleConsumer,
                payrollConsumer,
                fluence);
    }

    private OutboxEvent newEvent(String topic, UUID tenantId) {
        OutboxEvent event = new OutboxEvent();
        event.setId(UUID.randomUUID());
        event.setEventId("evt-" + topic);
        event.setTopic(topic);
        event.setPayload(PAYLOAD);
        event.setStatus("PENDING");
        event.setTenantId(tenantId);
        return event;
    }

    @Nested
    @DisplayName("processOneEvent — locking / skip")
    class Locking {

        @Test
        @DisplayName("returns early without dispatch or save when lockPendingById is empty")
        void emptyLock_skips() {
            UUID id = UUID.randomUUID();
            when(repository.lockPendingById(id)).thenReturn(Optional.empty());

            processor.processOneEvent(id);

            verify(repository).lockPendingById(id);
            verify(repository, never()).save(any());
            verify(repository, never()).markFailed(any(), anyString());
            verifyNoInteractions(notificationConsumer, approvalConsumer, auditConsumer,
                    employeeLifecycleConsumer, payrollConsumer, fluenceConsumer);
        }
    }

    @Nested
    @DisplayName("processOneEvent — happy path per topic")
    class HappyPath {

        @Test
        @DisplayName("NOTIFICATIONS dispatches to notification consumer and marks PROCESSED")
        void notifications() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.NOTIFICATIONS, UUID.randomUUID());
            NotificationEvent payload = new NotificationEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, NotificationEvent.class)).thenReturn(payload);

            processor.processOneEvent(event.getId());

            verify(notificationConsumer).process(payload);
            assertProcessedAndSaved(event);
        }

        @Test
        @DisplayName("APPROVALS dispatches to approval consumer and marks PROCESSED")
        void approvals() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.APPROVALS, UUID.randomUUID());
            ApprovalEvent payload = new ApprovalEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, ApprovalEvent.class)).thenReturn(payload);

            processor.processOneEvent(event.getId());

            verify(approvalConsumer).process(payload);
            assertProcessedAndSaved(event);
        }

        @Test
        @DisplayName("AUDIT dispatches to audit consumer and marks PROCESSED")
        void audit() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.AUDIT, UUID.randomUUID());
            AuditEvent payload = new AuditEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, AuditEvent.class)).thenReturn(payload);

            processor.processOneEvent(event.getId());

            verify(auditConsumer).process(payload);
            assertProcessedAndSaved(event);
        }

        @Test
        @DisplayName("EMPLOYEE_LIFECYCLE dispatches to employee consumer and marks PROCESSED")
        void employeeLifecycle() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.EMPLOYEE_LIFECYCLE, UUID.randomUUID());
            EmployeeLifecycleEvent payload = new EmployeeLifecycleEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, EmployeeLifecycleEvent.class)).thenReturn(payload);

            processor.processOneEvent(event.getId());

            verify(employeeLifecycleConsumer).process(payload);
            assertProcessedAndSaved(event);
        }

        @Test
        @DisplayName("PAYROLL_PROCESSING dispatches to payroll consumer and marks PROCESSED")
        void payrollProcessing() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.PAYROLL_PROCESSING, UUID.randomUUID());
            PayrollProcessingEvent payload = new PayrollProcessingEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, PayrollProcessingEvent.class)).thenReturn(payload);

            processor.processOneEvent(event.getId());

            verify(payrollConsumer).process(payload);
            assertProcessedAndSaved(event);
        }

        @Test
        @DisplayName("FLUENCE_CONTENT dispatches to fluence consumer when present and marks PROCESSED")
        void fluenceContentPresent() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.FLUENCE_CONTENT, UUID.randomUUID());
            FluenceContentEvent payload = new FluenceContentEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, FluenceContentEvent.class)).thenReturn(payload);

            processor.processOneEvent(event.getId());

            verify(fluenceConsumer).process(payload);
            assertProcessedAndSaved(event);
        }

        private void assertProcessedAndSaved(OutboxEvent event) {
            assertThat(event.getStatus()).isEqualTo("PROCESSED");
            assertThat(event.getProcessedAt()).isNotNull();
            verify(repository).save(event);
            verify(repository, never()).markFailed(any(), anyString());
        }
    }

    @Nested
    @DisplayName("processOneEvent — topic / consumer edge branches")
    class EdgeBranches {

        @Test
        @DisplayName("unknown topic warns, dispatches to no consumer, and still completes PROCESSED")
        void unknownTopic() {
            OutboxEvent event = newEvent("nu-aura.totally-unknown", UUID.randomUUID());
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));

            processor.processOneEvent(event.getId());

            assertThat(event.getStatus()).isEqualTo("PROCESSED");
            assertThat(event.getProcessedAt()).isNotNull();
            verify(repository).save(event);
            verifyNoInteractions(notificationConsumer, approvalConsumer, auditConsumer,
                    employeeLifecycleConsumer, payrollConsumer, fluenceConsumer);
            verify(repository, never()).markFailed(any(), anyString());
        }

        @Test
        @DisplayName("FLUENCE_CONTENT with no FluenceSearchConsumer skips dispatch but still ends PROCESSED")
        void fluenceContentAbsent() throws Exception {
            OutboxEventProcessor noFluence = newProcessor(Optional.empty());
            OutboxEvent event = newEvent(KafkaTopics.FLUENCE_CONTENT, UUID.randomUUID());
            FluenceContentEvent payload = new FluenceContentEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, FluenceContentEvent.class)).thenReturn(payload);

            noFluence.processOneEvent(event.getId());

            verifyNoInteractions(fluenceConsumer);
            assertThat(event.getStatus()).isEqualTo("PROCESSED");
            assertThat(event.getProcessedAt()).isNotNull();
            verify(repository).save(event);
        }
    }

    @Nested
    @DisplayName("processOneEvent — retry / failure")
    class RetryAndFailure {

        @Test
        @DisplayName("dispatch failure below MAX increments retryCount, sets lastError, and saves (not markFailed)")
        void retryBelowMax() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.NOTIFICATIONS, UUID.randomUUID());
            event.setRetryCount(2);
            NotificationEvent payload = new NotificationEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, NotificationEvent.class)).thenReturn(payload);
            doThrow(new RuntimeException("consumer boom")).when(notificationConsumer).process(payload);

            processor.processOneEvent(event.getId());

            assertThat(event.getRetryCount()).isEqualTo(3);
            assertThat(event.getLastError()).isEqualTo("consumer boom");
            assertThat(event.getStatus()).isEqualTo("PENDING");
            verify(repository).save(event);
            verify(repository, never()).markFailed(any(), anyString());
        }

        @Test
        @DisplayName("dispatch failure reaching MAX_RETRIES calls markFailed and does not save")
        void reachesMaxRetries() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.APPROVALS, UUID.randomUUID());
            event.setRetryCount(4); // nextRetry = 5 == MAX_RETRIES
            ApprovalEvent payload = new ApprovalEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, ApprovalEvent.class)).thenReturn(payload);
            doThrow(new RuntimeException("fatal boom")).when(approvalConsumer).process(payload);

            processor.processOneEvent(event.getId());

            verify(repository).markFailed(event.getId(), "fatal boom");
            verify(repository, never()).save(event);
        }

        @Test
        @DisplayName("markFailed truncates an over-long error message to 1000 chars")
        void truncatesLongError() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.AUDIT, UUID.randomUUID());
            event.setRetryCount(4);
            AuditEvent payload = new AuditEvent();
            String longMessage = "x".repeat(1500);
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, AuditEvent.class)).thenReturn(payload);
            doThrow(new RuntimeException(longMessage)).when(auditConsumer).process(payload);

            processor.processOneEvent(event.getId());

            ArgumentCaptor<String> errorCaptor = ArgumentCaptor.forClass(String.class);
            verify(repository).markFailed(eq(event.getId()), errorCaptor.capture());
            assertThat(errorCaptor.getValue()).hasSize(1000);
        }
    }

    @Nested
    @DisplayName("processOneEvent — tenant context lifecycle")
    class TenantContextLifecycle {

        @Test
        @DisplayName("clears TenantContext in finally on the happy path")
        void clearsContextOnSuccess() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.NOTIFICATIONS, UUID.randomUUID());
            NotificationEvent payload = new NotificationEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, NotificationEvent.class)).thenReturn(payload);

            processor.processOneEvent(event.getId());

            assertThat(TenantContext.getCurrentTenant()).isNull();
        }

        @Test
        @DisplayName("sets the event tenant inside dispatch and clears it afterwards")
        void setsTenantDuringDispatch() throws Exception {
            UUID tenantId = UUID.randomUUID();
            OutboxEvent event = newEvent(KafkaTopics.NOTIFICATIONS, tenantId);
            NotificationEvent payload = new NotificationEvent();
            UUID[] seenTenant = new UUID[1];
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, NotificationEvent.class)).thenAnswer(inv -> {
                seenTenant[0] = TenantContext.getCurrentTenant();
                return payload;
            });

            processor.processOneEvent(event.getId());

            assertThat(seenTenant[0]).isEqualTo(tenantId);
            assertThat(TenantContext.getCurrentTenant()).isNull();
        }

        @Test
        @DisplayName("does not set TenantContext when the event tenantId is null")
        void nullTenant_notSet() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.NOTIFICATIONS, null);
            NotificationEvent payload = new NotificationEvent();
            UUID[] seenTenant = new UUID[]{UUID.randomUUID()};
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, NotificationEvent.class)).thenAnswer(inv -> {
                seenTenant[0] = TenantContext.getCurrentTenant();
                return payload;
            });

            processor.processOneEvent(event.getId());

            assertThat(seenTenant[0]).isNull();
            assertThat(TenantContext.getCurrentTenant()).isNull();
        }

        @Test
        @DisplayName("clears TenantContext in finally even when dispatch fails")
        void clearsContextOnFailure() throws Exception {
            OutboxEvent event = newEvent(KafkaTopics.NOTIFICATIONS, UUID.randomUUID());
            NotificationEvent payload = new NotificationEvent();
            when(repository.lockPendingById(event.getId())).thenReturn(Optional.of(event));
            when(objectMapper.readValue(PAYLOAD, NotificationEvent.class)).thenReturn(payload);
            doThrow(new RuntimeException("boom")).when(notificationConsumer).process(payload);

            processor.processOneEvent(event.getId());

            assertThat(TenantContext.getCurrentTenant()).isNull();
        }
    }

    @Nested
    @DisplayName("pollAndProcess")
    class PollAndProcess {

        @Test
        @DisplayName("empty pending list is a no-op — no self dispatch")
        void emptyPending_noOp() {
            when(repository.findTop50ByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of());

            processor.pollAndProcess();

            verify(self, never()).processOneEvent(any());
        }

        @Test
        @DisplayName("delegates to self.processOneEvent once per pending candidate id")
        void nonEmptyPending_dispatchesEachId() {
            OutboxEvent e1 = newEvent(KafkaTopics.NOTIFICATIONS, UUID.randomUUID());
            OutboxEvent e2 = newEvent(KafkaTopics.APPROVALS, UUID.randomUUID());
            when(repository.findTop50ByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(e1, e2));

            processor.pollAndProcess();

            verify(self).processOneEvent(e1.getId());
            verify(self).processOneEvent(e2.getId());
        }
    }

    // ---------------------------------------------------------------------
    // Branch genuinely NOT unit-testable here:
    //   The FOR UPDATE SKIP LOCKED locking semantics of
    //   OutboxEventRepository.lockPendingById (whether a row held by a peer pod
    //   is skipped vs. blocked) cannot be exercised with a mocked repository —
    //   it depends on real PostgreSQL row locking and is covered at the
    //   integration/Testcontainers level only. Here we mock the Optional result
    //   to cover both the "locked/empty" and "found" code paths.
    // ---------------------------------------------------------------------
}
