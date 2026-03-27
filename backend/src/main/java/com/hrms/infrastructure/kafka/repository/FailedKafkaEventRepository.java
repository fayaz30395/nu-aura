package com.hrms.infrastructure.kafka.repository;

import com.hrms.domain.kafka.FailedKafkaEvent;
import com.hrms.domain.kafka.FailedKafkaEvent.FailedEventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link FailedKafkaEvent} — persistence layer for dead-lettered Kafka messages.
 *
 * <p>Provides both fine-grained retrieval (by ID, topic, status) and bulk queries
 * needed by the admin replay API and monitoring dashboards.
 */
@Repository
public interface FailedKafkaEventRepository extends JpaRepository<FailedKafkaEvent, UUID> {

    // ── Status-based queries ───────────────────────────────────────────────────

    /**
     * Returns a paginated list of all events with the given status,
     * ordered newest-first (useful for the admin review queue).
     */
    Page<FailedKafkaEvent> findByStatusOrderByCreatedAtDesc(FailedEventStatus status, Pageable pageable);

    // ── Topic-based queries ────────────────────────────────────────────────────

    /** Returns all events for a specific DLT topic, ordered newest-first. */
    Page<FailedKafkaEvent> findByTopicOrderByCreatedAtDesc(String topic, Pageable pageable);

    /**
     * Returns all events for a specific topic and status combination.
     * Used by the replay batch job to pick up {@code PENDING_REPLAY} events per topic.
     */
    List<FailedKafkaEvent> findByTopicAndStatus(String topic, FailedEventStatus status);

    // ── Duplicate-guard query ──────────────────────────────────────────────────

    /**
     * Returns the existing record for a given topic/partition/offset combination, if any.
     * Used by {@code DeadLetterHandler} to prevent duplicate inserts when the DLT consumer
     * is restarted with {@code earliest} offset reset.
     */
    Optional<FailedKafkaEvent> findByTopicAndPartitionAndOffset(String topic, int partition, long offset);

    // ── Count queries (used by monitoring dashboards) ──────────────────────────

    long countByStatus(FailedEventStatus status);

    long countByTopicAndStatus(String topic, FailedEventStatus status);

    // ── Bulk status transition ─────────────────────────────────────────────────

    /**
     * Marks all {@code PENDING_REPLAY} events for the given topic as {@code IGNORED}.
     * Called by admins when a whole DLT topic contains only known poison pills.
     *
     * @return the number of records updated
     */
    @Modifying
    @Transactional
    @Query("UPDATE FailedKafkaEvent f SET f.status = 'IGNORED' " +
           "WHERE f.topic = :topic AND f.status = 'PENDING_REPLAY'")
    int ignoreAllPendingForTopic(@Param("topic") String topic);

    // ── Replay count guard ─────────────────────────────────────────────────────

    /**
     * Returns events that have been replayed more than {@code maxReplayCount} times and
     * are still in PENDING state (potential poison pills that keep failing post-replay).
     */
    @Query("SELECT f FROM FailedKafkaEvent f " +
           "WHERE f.replayCount > :maxReplayCount AND f.status = 'PENDING_REPLAY'")
    List<FailedKafkaEvent> findSuspectedPoisonPills(@Param("maxReplayCount") int maxReplayCount);
}
