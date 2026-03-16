package com.hrms.domain.kafka;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persistence record for a Kafka message that exhausted all retry attempts
 * and was routed to a dead-letter topic (DLT).
 *
 * <p>Stored in {@code failed_kafka_events}. Provides an audit trail and the
 * foundation for the admin replay API ({@code /api/v1/admin/kafka/replay}).
 *
 * <h3>Lifecycle</h3>
 * <pre>
 *   DLT message arrives
 *     → DeadLetterHandler persists with status = PENDING_REPLAY
 *     → Admin reviews and either replays or ignores
 *     → status transitions to REPLAYED or IGNORED
 * </pre>
 *
 * <p>This entity is platform-level (not tenant-scoped) because DLT events
 * may arrive before the tenant context is established and because they are
 * primarily an infrastructure concern for SUPER_ADMIN users.
 */
@Entity
@Table(
        name = "failed_kafka_events",
        indexes = {
                @Index(name = "idx_fke_topic", columnList = "topic"),
                @Index(name = "idx_fke_status", columnList = "status"),
                @Index(name = "idx_fke_created_at", columnList = "created_at"),
                @Index(name = "idx_fke_topic_status", columnList = "topic, status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FailedKafkaEvent extends BaseEntity {

    /** Kafka topic from which the dead-letter message was consumed (the {@code .dlt} topic). */
    @Column(nullable = false, length = 200)
    private String topic;

    /** Partition within the dead-letter topic. */
    @Column(nullable = false)
    private int partition;

    /** Offset of the message in the dead-letter topic. */
    @Column(nullable = false)
    private long offset;

    /**
     * Raw message payload, truncated to {@value #MAX_PAYLOAD_LENGTH} characters.
     * Full payload may not be stored to avoid bloating the DB with very large events.
     */
    @Column(columnDefinition = "TEXT")
    private String payload;

    /**
     * Indicates whether the stored payload was truncated.
     * When {@code true}, the admin should refer to the original Kafka log for the
     * complete message if replay accuracy is critical.
     */
    @Column(nullable = false)
    private boolean payloadTruncated;

    /** Human-readable description of why the message failed (exception message, if known). */
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    /** Current lifecycle status of this failed event. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FailedEventStatus status;

    // ── Replay fields ──────────────────────────────────────────────────────────

    /**
     * Topic to which the payload should be replayed.
     * Typically the original (non-DLT) topic derived by stripping the {@code .dlt} suffix.
     * Populated at replay time.
     */
    @Column(length = 200)
    private String targetTopic;

    /** Timestamp when the replay was executed. {@code null} until replayed. */
    @Column
    private LocalDateTime replayedAt;

    /** User ID of the admin who triggered the replay. {@code null} until replayed. */
    @Column
    private UUID replayedBy;

    /**
     * Number of times this event has been replayed.
     * Supports detecting runaway replay loops (e.g., a poison pill that keeps failing).
     */
    @Column(nullable = false)
    private int replayCount;

    // ── Constants ──────────────────────────────────────────────────────────────

    /**
     * Maximum payload length stored in the DB.
     * Matches {@code DeadLetterHandler.PAYLOAD_LOG_MAX_LENGTH} so that the logged excerpt
     * and the persisted excerpt are always identical.
     */
    public static final int MAX_PAYLOAD_LENGTH = 500;

    // ── Enum ───────────────────────────────────────────────────────────────────

    public enum FailedEventStatus {
        /**
         * Event has been received and stored; awaiting admin decision.
         * This is the initial state assigned by {@code DeadLetterHandler}.
         */
        PENDING_REPLAY,

        /**
         * Admin has replayed the event to the target topic.
         * The original DLT offset is preserved; this record is kept for audit purposes.
         */
        REPLAYED,

        /**
         * Admin has explicitly decided not to replay this event.
         * Used for known poison pills or stale events that should not be reprocessed.
         */
        IGNORED
    }
}
