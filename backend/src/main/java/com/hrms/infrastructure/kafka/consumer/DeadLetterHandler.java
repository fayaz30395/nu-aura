package com.hrms.infrastructure.kafka.consumer;

import com.hrms.domain.kafka.FailedKafkaEvent;
import com.hrms.domain.kafka.FailedKafkaEvent.FailedEventStatus;
import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.repository.FailedKafkaEventRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Handler for messages that failed all retry attempts and landed in dead letter topics (DLT).
 *
 * <p>Provides centralised monitoring and structured logging of failed events.
 * Each DLT event is:
 * <ol>
 *   <li>Logged at ERROR level with full context (topic, partition, offset, payload excerpt).</li>
 *   <li>Persisted to {@code failed_kafka_events} for admin inspection and replay.</li>
 *   <li>Counted via a Micrometer {@link Counter} tagged by topic — visible in
 *       Prometheus/Grafana as {@code kafka_dlt_messages_total{topic="…"}}.</li>
 *   <li>Acknowledged unconditionally so the consumer does not stall.</li>
 * </ol>
 *
 * <h3>Replay</h3>
 * Admins can replay a stored event via the
 * {@code POST /api/v1/admin/kafka/replay/{failedEventId}} endpoint, which calls
 * {@link #replayFailedEvent(UUID, UUID)}.  The original payload is republished
 * to the non-DLT variant of the topic (e.g. {@code nu-aura.approvals.dlt} →
 * {@code nu-aura.approvals}).  The record is marked {@code REPLAYED} and the
 * {@link #replayCount} is incremented (high replay counts indicate poison pills).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeadLetterHandler {

    private static final String METRIC_DLT_TOTAL = "kafka.dlt.messages.total";
    private static final int PAYLOAD_LOG_MAX_LENGTH = 500;

    /**
     * Maximum replay attempts before a warning is emitted.
     * Events exceeding this threshold are flagged as suspected poison pills.
     */
    private static final int MAX_SAFE_REPLAY_COUNT = 3;

    private final MeterRegistry meterRegistry;
    private final FailedKafkaEventRepository failedKafkaEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Per-topic counters, lazily initialised to avoid startup registration order issues.
     */
    private final Map<String, Counter> dltCounters = new ConcurrentHashMap<>();

    private static String truncate(String text, int maxLength) {
        if (text == null) {
            return "<null>";
        }
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "…[truncated]";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DLT consumer
    // ─────────────────────────────────────────────────────────────────────────

    @PostConstruct
    void registerMetrics() {
        // Pre-register counters for known DLT topics so they appear in Prometheus
        // even if no DLT messages have arrived yet (useful for alerting thresholds).
        List.of(
                KafkaTopics.APPROVALS_DLT,
                KafkaTopics.NOTIFICATIONS_DLT,
                KafkaTopics.AUDIT_DLT,
                KafkaTopics.EMPLOYEE_LIFECYCLE_DLT,
                KafkaTopics.FLUENCE_CONTENT_DLT,
                KafkaTopics.PAYROLL_PROCESSING_DLT
        ).forEach(topic -> dltCounters.put(topic, buildCounter(topic)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Persistence helper
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Consumes messages from all known DLT topics.
     *
     * <p>Uses a dedicated {@code dltListenerContainerFactory} (configured in
     * {@code KafkaConfig}) with manual acknowledgment mode.
     */
    @KafkaListener(
            topics = {
                    KafkaTopics.APPROVALS_DLT,
                    KafkaTopics.NOTIFICATIONS_DLT,
                    KafkaTopics.AUDIT_DLT,
                    KafkaTopics.EMPLOYEE_LIFECYCLE_DLT,
                    KafkaTopics.FLUENCE_CONTENT_DLT
            },
            groupId = KafkaTopics.GROUP_DLT_HANDLER,
            containerFactory = "dltListenerContainerFactory"
    )
    @Transactional
    public void handleDeadLetter(
            @Payload String message,
            Acknowledgment acknowledgment,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        try {
            String payloadExcerpt = truncate(message, PAYLOAD_LOG_MAX_LENGTH);

            log.error("[DLT] Dead letter received — topic={}, partition={}, offset={}, payloadExcerpt={}",
                    topic, partition, offset, payloadExcerpt);

            // Increment the per-topic Micrometer counter
            dltCounters.computeIfAbsent(topic, this::buildCounter).increment();

            // Structured warning for alerting dashboards (Loki / CloudWatch Insights)
            log.warn("[DLT_ALERT] topic={} partition={} offset={} action=DEAD_LETTERED",
                    topic, partition, offset);

            // Persist to DB (idempotent: skip duplicates on consumer restart)
            persistIfAbsent(topic, partition, offset, message);

        } catch (Exception e) { // Intentional broad catch — DLT last resort
            log.error("[DLT] Unexpected error while handling dead letter from {}: {}", topic, e.getMessage(), e);
        } finally {
            // Always acknowledge — the DLT is the end of the retry road.
            // Failing to acknowledge would cause the consumer to stall.
            acknowledgment.acknowledge();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Replay API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Persists the dead-lettered event if no record with the same
     * topic/partition/offset already exists (idempotency guard for consumer restart).
     */
    private void persistIfAbsent(String topic, int partition, long offset, String rawPayload) {
        boolean alreadyStored = failedKafkaEventRepository
                .findByTopicAndPartitionAndOffset(topic, partition, offset)
                .isPresent();

        if (alreadyStored) {
            log.debug("[DLT] Duplicate DLT event skipped: topic={} partition={} offset={}", topic, partition, offset);
            return;
        }

        String safePayload = rawPayload == null ? "" : rawPayload;
        boolean truncated = safePayload.length() > PAYLOAD_LOG_MAX_LENGTH;
        String storedPayload = truncated ? safePayload.substring(0, PAYLOAD_LOG_MAX_LENGTH) : safePayload;

        // Derive the default replay target: strip ".dlt" suffix to get the original topic
        String targetTopic = topic.endsWith(".dlt") ? topic.substring(0, topic.length() - 4) : topic;

        FailedKafkaEvent event = FailedKafkaEvent.builder()
                .topic(topic)
                .partition(partition)
                .offset(offset)
                .payload(storedPayload)
                .payloadTruncated(truncated)
                .status(FailedEventStatus.PENDING_REPLAY)
                .targetTopic(targetTopic)
                .replayCount(0)
                .build();

        failedKafkaEventRepository.save(event);
        log.info("[DLT] Persisted failed event: topic={} partition={} offset={} truncated={}", topic, partition, offset, truncated);
    }

    /**
     * Replays a dead-lettered event by republishing its stored payload to the
     * configured {@link FailedKafkaEvent#getTargetTopic()}.
     *
     * <p>Callers (typically the admin REST controller) are responsible for ensuring
     * the requesting user has the {@code SUPER_ADMIN} role before invoking this method.
     *
     * @param failedEventId UUID of the {@link FailedKafkaEvent} record to replay.
     * @param replayedBy    UUID of the admin user triggering the replay (for audit).
     * @throws IllegalArgumentException if the event does not exist.
     * @throws IllegalStateException    if the event is not in {@code PENDING_REPLAY} status,
     *                                  or if it has been replayed too many times (poison-pill guard).
     */
    @Transactional
    public void replayFailedEvent(UUID failedEventId, UUID replayedBy) {
        FailedKafkaEvent event = failedKafkaEventRepository.findById(failedEventId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Failed Kafka event not found: " + failedEventId));

        if (event.getStatus() != FailedEventStatus.PENDING_REPLAY) {
            throw new IllegalStateException(
                    "Cannot replay event " + failedEventId + " — current status: " + event.getStatus());
        }

        if (event.getReplayCount() >= MAX_SAFE_REPLAY_COUNT) {
            log.warn("[DLT] Replay rejected for event {} — replayCount={} (suspected poison pill). " +
                    "Use ignoreFailedEvent() to dismiss it.", failedEventId, event.getReplayCount());
            throw new IllegalStateException(
                    "Event " + failedEventId + " has been replayed " + event.getReplayCount() +
                            " times without success. Investigate before replaying again.");
        }

        String targetTopic = event.getTargetTopic();
        if (targetTopic == null || targetTopic.isBlank()) {
            throw new IllegalStateException(
                    "No target topic configured for event " + failedEventId);
        }

        // Publish to the target topic
        kafkaTemplate.send(targetTopic, event.getPayload());

        // Update record
        event.setStatus(FailedEventStatus.REPLAYED);
        event.setReplayedAt(LocalDateTime.now());
        event.setReplayedBy(replayedBy);
        event.setReplayCount(event.getReplayCount() + 1);
        failedKafkaEventRepository.save(event);

        log.info("[DLT] Replayed event {} to topic={} by admin={}", failedEventId, targetTopic, replayedBy);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Marks a dead-lettered event as {@code IGNORED} without replaying it.
     * Use for known poison pills or stale events that should not be reprocessed.
     *
     * @param failedEventId UUID of the event to ignore.
     * @param ignoredBy     UUID of the admin making the decision.
     */
    @Transactional
    public void ignoreFailedEvent(UUID failedEventId, UUID ignoredBy) {
        FailedKafkaEvent event = failedKafkaEventRepository.findById(failedEventId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Failed Kafka event not found: " + failedEventId));

        if (event.getStatus() != FailedEventStatus.PENDING_REPLAY) {
            throw new IllegalStateException(
                    "Cannot ignore event " + failedEventId + " — current status: " + event.getStatus());
        }

        event.setStatus(FailedEventStatus.IGNORED);
        failedKafkaEventRepository.save(event);

        log.info("[DLT] Event {} ignored by admin={}", failedEventId, ignoredBy);
    }

    private Counter buildCounter(String topic) {
        return Counter.builder(METRIC_DLT_TOTAL)
                .description("Total number of messages that landed in the Kafka dead letter topic")
                .tags(List.of(Tag.of("topic", topic)))
                .register(meterRegistry);
    }
}
