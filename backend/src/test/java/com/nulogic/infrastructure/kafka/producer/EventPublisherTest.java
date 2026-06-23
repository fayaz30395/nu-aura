package com.nulogic.infrastructure.kafka.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.infrastructure.kafka.KafkaTopics;
import com.nulogic.infrastructure.kafka.outbox.OutboxEvent;
import com.nulogic.infrastructure.kafka.outbox.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link EventPublisher}.
 *
 * <p>A real {@link ObjectMapper} (with JavaTime support) is used so the
 * {@code writeValueAsString} serialization path is genuinely exercised. The
 * repository is mocked and the persisted {@link OutboxEvent} is captured to assert
 * topic, tenant, eventId, payload, and status.</p>
 */
class EventPublisherTest {

    private OutboxEventRepository repository;
    private ObjectMapper objectMapper;
    private TenantTimeService tenantTimeService;
    private EventPublisher publisher;

    @BeforeEach
    void setUp() {
        repository = mock(OutboxEventRepository.class);
        objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        tenantTimeService = mock(TenantTimeService.class);
        when(tenantTimeService.now(any())).thenReturn(LocalDateTime.of(2026, 6, 24, 10, 0));
        publisher = new EventPublisher(repository, objectMapper, tenantTimeService);
    }

    private OutboxEvent capturePersisted() {
        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }

    private void assertCommonOutbox(OutboxEvent persisted, String expectedTopic, UUID expectedTenant) {
        assertThat(persisted.getTopic()).isEqualTo(expectedTopic);
        assertThat(persisted.getTenantId()).isEqualTo(expectedTenant);
        assertThat(persisted.getStatus()).isEqualTo("PENDING");
        assertThat(persisted.getEventId()).isNotBlank();
        // partition key mirrors the event id
        assertThat(persisted.getPartitionKey()).isEqualTo(persisted.getEventId());
        assertThat(persisted.getEventClass()).isNotBlank();
        assertThat(persisted.getPayload()).isNotBlank();
    }

    @Nested
    @DisplayName("publish* methods persist a PENDING OutboxEvent on the right topic")
    class PublishMethods {

        @Test
        @DisplayName("publishApprovalEvent -> APPROVALS topic with JSON payload")
        void approval() {
            UUID tenant = UUID.randomUUID();

            CompletableFuture<Void> future = publisher.publishApprovalEvent(
                    UUID.randomUUID(), UUID.randomUUID(), "LEAVE", "APPROVED",
                    tenant, UUID.randomUUID(), UUID.randomUUID(), "ok",
                    true, Map.of("k", "v"));

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertCommonOutbox(persisted, KafkaTopics.APPROVALS, tenant);
            assertThat(persisted.getPayload()).contains("\"status\":\"APPROVED\"");
        }

        @Test
        @DisplayName("publishNotificationEvent -> NOTIFICATIONS topic with JSON payload")
        void notification() {
            UUID tenant = UUID.randomUUID();

            CompletableFuture<Void> future = publisher.publishNotificationEvent(
                    UUID.randomUUID(), "EMAIL", "Subject", "Body", "tmpl",
                    Map.of("name", "Alice"), tenant, UUID.randomUUID(),
                    "LEAVE_REQUEST", "/url", "HIGH");

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertCommonOutbox(persisted, KafkaTopics.NOTIFICATIONS, tenant);
            assertThat(persisted.getPayload()).contains("\"channel\":\"EMAIL\"");
        }

        @Test
        @DisplayName("publishAuditEvent -> AUDIT topic with JSON payload")
        void audit() {
            UUID tenant = UUID.randomUUID();

            CompletableFuture<Void> future = publisher.publishAuditEvent(
                    UUID.randomUUID(), "CREATE", "Employee", UUID.randomUUID(),
                    tenant, "old", "new", "127.0.0.1", "agent", "POST",
                    "/api/employees", 201, 42L, "created employee");

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertCommonOutbox(persisted, KafkaTopics.AUDIT, tenant);
            assertThat(persisted.getPayload()).contains("\"action\":\"CREATE\"");
        }

        @Test
        @DisplayName("publishEmployeeLifecycleEvent -> EMPLOYEE_LIFECYCLE topic with JSON payload")
        void employeeLifecycle() {
            UUID tenant = UUID.randomUUID();

            CompletableFuture<Void> future = publisher.publishEmployeeLifecycleEvent(
                    UUID.randomUUID(), "ONBOARDED", UUID.randomUUID(), tenant,
                    "a@b.com", "Alice", UUID.randomUUID(), UUID.randomUUID(),
                    "Engineer", "FULL_TIME", Map.of("foo", "bar"), false);

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertCommonOutbox(persisted, KafkaTopics.EMPLOYEE_LIFECYCLE, tenant);
            assertThat(persisted.getPayload()).contains("EMPLOYEE_ONBOARDED");
        }

        @Test
        @DisplayName("publishPayrollProcessingEvent -> PAYROLL_PROCESSING topic with JSON payload")
        void payrollProcessing() {
            UUID tenant = UUID.randomUUID();

            CompletableFuture<Void> future = publisher.publishPayrollProcessingEvent(
                    UUID.randomUUID(), tenant, UUID.randomUUID(), 6, 2026);

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertCommonOutbox(persisted, KafkaTopics.PAYROLL_PROCESSING, tenant);
            assertThat(persisted.getPayload()).contains("PAYROLL_PROCESSING_REQUESTED");
        }

        @Test
        @DisplayName("publishFluenceContent -> FLUENCE_CONTENT topic with JSON payload")
        void fluenceContent() {
            UUID tenant = UUID.randomUUID();

            CompletableFuture<Void> future = publisher.publishFluenceContent(
                    "WIKI", UUID.randomUUID(), "CREATED", tenant);

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertCommonOutbox(persisted, KafkaTopics.FLUENCE_CONTENT, tenant);
            assertThat(persisted.getPayload()).contains("\"action\":\"CREATED\"");
        }
    }

    @Nested
    @DisplayName("edge / null branches")
    class EdgeBranches {

        @Test
        @DisplayName("null tenantId still persists an event with a null tenant column")
        void nullTenant() {
            CompletableFuture<Void> future = publisher.publishFluenceContent(
                    "BLOG", UUID.randomUUID(), "UPDATED", null);

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertThat(persisted.getTopic()).isEqualTo(KafkaTopics.FLUENCE_CONTENT);
            assertThat(persisted.getTenantId()).isNull();
            assertThat(persisted.getStatus()).isEqualTo("PENDING");
            assertThat(persisted.getPayload()).isNotBlank();
        }

        @Test
        @DisplayName("optional collection/string args may be null without breaking serialization")
        void nullOptionalArgs() {
            UUID tenant = UUID.randomUUID();

            CompletableFuture<Void> future = publisher.publishNotificationEvent(
                    UUID.randomUUID(), "PUSH", null, null, null,
                    null, tenant, null, null, null, null);

            assertThat(future).isCompleted();
            OutboxEvent persisted = capturePersisted();
            assertCommonOutbox(persisted, KafkaTopics.NOTIFICATIONS, tenant);
        }

        @Test
        @DisplayName("serialization failure returns a failed future and does not persist")
        void serializationFailure() throws Exception {
            // Swap in a mock mapper that throws on write to exercise the catch branch.
            ObjectMapper failing = mock(ObjectMapper.class);
            when(failing.writeValueAsString(any()))
                    .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("boom") {});
            EventPublisher failingPublisher =
                    new EventPublisher(repository, failing, tenantTimeService);

            CompletableFuture<Void> future = failingPublisher.publishFluenceContent(
                    "WIKI", UUID.randomUUID(), "CREATED", UUID.randomUUID());

            assertThat(future).isCompletedExceptionally();
            verify(repository, never()).save(any());
        }
    }
}
