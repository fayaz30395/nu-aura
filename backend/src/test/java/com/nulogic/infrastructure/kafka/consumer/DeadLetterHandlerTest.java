package com.nulogic.infrastructure.kafka.consumer;

import com.nulogic.infrastructure.kafka.FailedKafkaEvent;
import com.nulogic.infrastructure.kafka.FailedKafkaEvent.FailedEventStatus;
import com.nulogic.infrastructure.kafka.IdempotencyService;
import com.nulogic.infrastructure.kafka.KafkaTopics;
import com.nulogic.infrastructure.kafka.outbox.OutboxEvent;
import com.nulogic.infrastructure.kafka.outbox.OutboxEventRepository;
import com.nulogic.infrastructure.kafka.repository.FailedKafkaEventRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link DeadLetterHandler}.
 *
 * <p>Exercises the {@code @KafkaListener} handler republish/persist/ack logic and the
 * replay/ignore admin API. No Spring context, Kafka, or DB — collaborators are mocked,
 * with a real {@link SimpleMeterRegistry} so per-topic counters behave like production.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DeadLetterHandlerTest {

    @Mock
    private FailedKafkaEventRepository failedKafkaEventRepository;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private Acknowledgment acknowledgment;

    @Captor
    private ArgumentCaptor<FailedKafkaEvent> eventCaptor;

    @Captor
    private ArgumentCaptor<OutboxEvent> outboxCaptor;

    private MeterRegistry meterRegistry;
    private DeadLetterHandler handler;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        handler = new DeadLetterHandler(
                meterRegistry,
                failedKafkaEventRepository,
                kafkaTemplate,
                outboxEventRepository,
                idempotencyService);
    }

    // ── handleDeadLetter ─────────────────────────────────────────────────────

    @Test
    @DisplayName("handleDeadLetter persists a new event, increments the counter, and acknowledges")
    void handleDeadLetter_firstTime_persistsAndAcks() {
        String topic = KafkaTopics.APPROVALS_DLT;
        when(idempotencyService.tryProcess(anyString())).thenReturn(true);
        when(failedKafkaEventRepository.findByTopicAndPartitionAndOffset(topic, 2, 99L))
                .thenReturn(Optional.empty());

        handler.handleDeadLetter("the-payload", acknowledgment, topic, 2, 99L);

        verify(failedKafkaEventRepository).save(eventCaptor.capture());
        FailedKafkaEvent saved = eventCaptor.getValue();
        assertThat(saved.getTopic()).isEqualTo(topic);
        assertThat(saved.getPartition()).isEqualTo(2);
        assertThat(saved.getOffset()).isEqualTo(99L);
        assertThat(saved.getPayload()).isEqualTo("the-payload");
        assertThat(saved.isPayloadTruncated()).isFalse();
        assertThat(saved.getStatus()).isEqualTo(FailedEventStatus.PENDING_REPLAY);
        // ".dlt" suffix stripped to derive the replay target.
        assertThat(saved.getTargetTopic()).isEqualTo(KafkaTopics.APPROVALS);
        assertThat(saved.getReplayCount()).isZero();

        // Counter incremented for this topic.
        assertThat(meterRegistry.get("kafka.dlt.messages.total").tag("topic", topic).counter().count())
                .isEqualTo(1.0);

        verify(acknowledgment).acknowledge();
        verify(idempotencyService, never()).release(anyString());
    }

    @Test
    @DisplayName("handleDeadLetter builds the idempotency key from topic:partition:offset")
    void handleDeadLetter_idempotencyKeyShape() {
        when(idempotencyService.tryProcess(anyString())).thenReturn(true);
        when(failedKafkaEventRepository.findByTopicAndPartitionAndOffset(anyString(), anyInt(), anyLong()))
                .thenReturn(Optional.empty());

        handler.handleDeadLetter("p", acknowledgment, KafkaTopics.NOTIFICATIONS_DLT, 7, 4242L);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(idempotencyService).tryProcess(keyCaptor.capture());
        assertThat(keyCaptor.getValue())
                .isEqualTo("dlt:" + KafkaTopics.NOTIFICATIONS_DLT + ":7:4242");
    }

    @Test
    @DisplayName("handleDeadLetter skips processing on duplicate delivery but still acknowledges")
    void handleDeadLetter_duplicate_skipsButAcks() {
        when(idempotencyService.tryProcess(anyString())).thenReturn(false);

        handler.handleDeadLetter("payload", acknowledgment, KafkaTopics.AUDIT_DLT, 0, 1L);

        verify(failedKafkaEventRepository, never()).save(any());
        verify(failedKafkaEventRepository, never())
                .findByTopicAndPartitionAndOffset(anyString(), anyInt(), anyLong());
        verify(acknowledgment).acknowledge();
        verify(idempotencyService, never()).release(anyString());
    }

    @Test
    @DisplayName("handleDeadLetter does not re-persist when the event is already stored")
    void handleDeadLetter_alreadyStored_skipsSave() {
        String topic = KafkaTopics.AUDIT_DLT;
        when(idempotencyService.tryProcess(anyString())).thenReturn(true);
        when(failedKafkaEventRepository.findByTopicAndPartitionAndOffset(topic, 0, 5L))
                .thenReturn(Optional.of(new FailedKafkaEvent()));

        handler.handleDeadLetter("payload", acknowledgment, topic, 0, 5L);

        verify(failedKafkaEventRepository, never()).save(any());
        // Counter still incremented before the persist guard.
        assertThat(meterRegistry.get("kafka.dlt.messages.total").tag("topic", topic).counter().count())
                .isEqualTo(1.0);
        verify(acknowledgment).acknowledge();
    }

    @Test
    @DisplayName("handleDeadLetter truncates payloads longer than 500 chars before persisting")
    void handleDeadLetter_truncatesLongPayload() {
        String topic = KafkaTopics.FLUENCE_CONTENT_DLT;
        String longPayload = "x".repeat(600);
        when(idempotencyService.tryProcess(anyString())).thenReturn(true);
        when(failedKafkaEventRepository.findByTopicAndPartitionAndOffset(topic, 1, 10L))
                .thenReturn(Optional.empty());

        handler.handleDeadLetter(longPayload, acknowledgment, topic, 1, 10L);

        verify(failedKafkaEventRepository).save(eventCaptor.capture());
        FailedKafkaEvent saved = eventCaptor.getValue();
        assertThat(saved.isPayloadTruncated()).isTrue();
        assertThat(saved.getPayload()).hasSize(500);
        assertThat(saved.getPayload()).isEqualTo("x".repeat(500));
    }

    @Test
    @DisplayName("handleDeadLetter persists empty string when payload is null and still acknowledges")
    void handleDeadLetter_nullPayload_storesEmpty() {
        String topic = KafkaTopics.EMPLOYEE_LIFECYCLE_DLT;
        when(idempotencyService.tryProcess(anyString())).thenReturn(true);
        when(failedKafkaEventRepository.findByTopicAndPartitionAndOffset(topic, 0, 0L))
                .thenReturn(Optional.empty());

        handler.handleDeadLetter(null, acknowledgment, topic, 0, 0L);

        verify(failedKafkaEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getPayload()).isEmpty();
        assertThat(eventCaptor.getValue().isPayloadTruncated()).isFalse();
        verify(acknowledgment).acknowledge();
    }

    @Test
    @DisplayName("handleDeadLetter keeps the original topic as target when it has no .dlt suffix")
    void handleDeadLetter_noDltSuffix_keepsTopicAsTarget() {
        String topic = "nu-aura.custom-no-suffix";
        when(idempotencyService.tryProcess(anyString())).thenReturn(true);
        when(failedKafkaEventRepository.findByTopicAndPartitionAndOffset(topic, 0, 0L))
                .thenReturn(Optional.empty());

        handler.handleDeadLetter("p", acknowledgment, topic, 0, 0L);

        verify(failedKafkaEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getTargetTopic()).isEqualTo(topic);
    }

    @Test
    @DisplayName("handleDeadLetter releases the idempotency claim and acknowledges when persistence throws")
    void handleDeadLetter_persistThrows_releasesAndAcks() {
        String topic = KafkaTopics.PAYROLL_PROCESSING_DLT;
        when(idempotencyService.tryProcess(anyString())).thenReturn(true);
        when(failedKafkaEventRepository.findByTopicAndPartitionAndOffset(topic, 3, 77L))
                .thenThrow(new RuntimeException("DB unavailable"));

        // Broad catch in the handler means no exception escapes.
        handler.handleDeadLetter("payload", acknowledgment, topic, 3, 77L);

        verify(idempotencyService).release("dlt:" + topic + ":3:77");
        verify(acknowledgment).acknowledge();
    }

    // ── replayFailedEvent ────────────────────────────────────────────────────

    @Test
    @DisplayName("replayFailedEvent publishes directly to the target topic when outbox disabled")
    void replayFailedEvent_kafkaPath_sendsAndMarksReplayed() {
        ReflectionTestUtils.setField(handler, "outboxEnabled", false);
        UUID id = UUID.randomUUID();
        UUID admin = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.APPROVALS, "replay-payload", 0);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        handler.replayFailedEvent(id, admin);

        verify(kafkaTemplate).send(KafkaTopics.APPROVALS, "replay-payload");
        verifyNoInteractions(outboxEventRepository);
        assertThat(event.getStatus()).isEqualTo(FailedEventStatus.REPLAYED);
        assertThat(event.getReplayedBy()).isEqualTo(admin);
        assertThat(event.getReplayedAt()).isNotNull();
        assertThat(event.getReplayCount()).isEqualTo(1);
        verify(failedKafkaEventRepository).save(event);
    }

    @Test
    @DisplayName("replayFailedEvent routes through the outbox when outbox enabled")
    void replayFailedEvent_outboxPath_queuesOutboxEvent() {
        ReflectionTestUtils.setField(handler, "outboxEnabled", true);
        UUID id = UUID.randomUUID();
        UUID admin = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.NOTIFICATIONS, "outbox-payload", 0);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        handler.replayFailedEvent(id, admin);

        verify(outboxEventRepository).save(outboxCaptor.capture());
        OutboxEvent queued = outboxCaptor.getValue();
        assertThat(queued.getTopic()).isEqualTo(KafkaTopics.NOTIFICATIONS);
        assertThat(queued.getPayload()).isEqualTo("outbox-payload");
        assertThat(queued.getEventClass()).isEqualTo(FailedKafkaEvent.class.getName());
        assertThat(queued.getEventId()).isNotBlank();
        verify(kafkaTemplate, never()).send(anyString(), any());
        assertThat(event.getStatus()).isEqualTo(FailedEventStatus.REPLAYED);
        assertThat(event.getReplayCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("replayFailedEvent throws IllegalArgumentException when the event does not exist")
    void replayFailedEvent_notFound_throws() {
        UUID id = UUID.randomUUID();
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.replayFailedEvent(id, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(id.toString());

        verify(kafkaTemplate, never()).send(anyString(), any());
        verify(failedKafkaEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("replayFailedEvent rejects events not in PENDING_REPLAY status")
    void replayFailedEvent_wrongStatus_throws() {
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.APPROVALS, "p", 0);
        event.setStatus(FailedEventStatus.IGNORED);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> handler.replayFailedEvent(id, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("IGNORED");

        verify(kafkaTemplate, never()).send(anyString(), any());
    }

    @Test
    @DisplayName("replayFailedEvent rejects suspected poison pills (replayCount >= 3)")
    void replayFailedEvent_poisonPill_throws() {
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.APPROVALS, "p", 3);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> handler.replayFailedEvent(id, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("replayed");

        verify(kafkaTemplate, never()).send(anyString(), any());
        verify(failedKafkaEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("replayFailedEvent throws when the target topic is null")
    void replayFailedEvent_nullTargetTopic_throws() {
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(null, "p", 0);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> handler.replayFailedEvent(id, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No target topic");

        verify(kafkaTemplate, never()).send(anyString(), any());
    }

    @Test
    @DisplayName("replayFailedEvent throws when the target topic is blank")
    void replayFailedEvent_blankTargetTopic_throws() {
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent("   ", "p", 0);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> handler.replayFailedEvent(id, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No target topic");
    }

    @Test
    @DisplayName("replayFailedEvent accepts replayCount = 2 (boundary below the poison-pill threshold)")
    void replayFailedEvent_boundaryReplayCount_succeeds() {
        ReflectionTestUtils.setField(handler, "outboxEnabled", false);
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.APPROVALS, "p", 2);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        handler.replayFailedEvent(id, UUID.randomUUID());

        verify(kafkaTemplate).send(KafkaTopics.APPROVALS, "p");
        assertThat(event.getReplayCount()).isEqualTo(3);
    }

    // ── ignoreFailedEvent ────────────────────────────────────────────────────

    @Test
    @DisplayName("ignoreFailedEvent marks a PENDING_REPLAY event as IGNORED")
    void ignoreFailedEvent_marksIgnored() {
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.APPROVALS, "p", 0);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        handler.ignoreFailedEvent(id, UUID.randomUUID());

        assertThat(event.getStatus()).isEqualTo(FailedEventStatus.IGNORED);
        verify(failedKafkaEventRepository).save(event);
    }

    @Test
    @DisplayName("ignoreFailedEvent throws IllegalArgumentException when the event does not exist")
    void ignoreFailedEvent_notFound_throws() {
        UUID id = UUID.randomUUID();
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.ignoreFailedEvent(id, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(id.toString());
    }

    @Test
    @DisplayName("ignoreFailedEvent rejects events not in PENDING_REPLAY status")
    void ignoreFailedEvent_wrongStatus_throws() {
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.APPROVALS, "p", 0);
        event.setStatus(FailedEventStatus.REPLAYED);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> handler.ignoreFailedEvent(id, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("REPLAYED");

        verify(failedKafkaEventRepository, never()).save(any());
    }

    // ── admin query / maintenance API ────────────────────────────────────────

    @Test
    @DisplayName("ignoreAllForTopic delegates to the repository bulk update")
    void ignoreAllForTopic_delegates() {
        when(failedKafkaEventRepository.ignoreAllPendingForTopic(KafkaTopics.APPROVALS_DLT))
                .thenReturn(5);

        int updated = handler.ignoreAllForTopic(KafkaTopics.APPROVALS_DLT);

        assertThat(updated).isEqualTo(5);
        verify(failedKafkaEventRepository).ignoreAllPendingForTopic(KafkaTopics.APPROVALS_DLT);
    }

    @Test
    @DisplayName("findFailedEvent delegates to the repository findById")
    void findFailedEvent_delegates() {
        UUID id = UUID.randomUUID();
        FailedKafkaEvent event = pendingEvent(KafkaTopics.APPROVALS, "p", 0);
        when(failedKafkaEventRepository.findById(id)).thenReturn(Optional.of(event));

        Optional<FailedKafkaEvent> result = handler.findFailedEvent(id);

        assertThat(result).containsSame(event);
    }

    @Test
    @DisplayName("listSuspectedPoisonPills queries with the MAX_SAFE_REPLAY_COUNT threshold")
    void listSuspectedPoisonPills_usesThreshold() {
        handler.listSuspectedPoisonPills();

        verify(failedKafkaEventRepository).findSuspectedPoisonPills(3);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static FailedKafkaEvent pendingEvent(String targetTopic, String payload, int replayCount) {
        FailedKafkaEvent event = new FailedKafkaEvent();
        event.setStatus(FailedEventStatus.PENDING_REPLAY);
        event.setTargetTopic(targetTopic);
        event.setPayload(payload);
        event.setReplayCount(replayCount);
        return event;
    }
}
