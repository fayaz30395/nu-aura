package com.nulogic.infrastructure.kafka.outbox;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    List<OutboxEvent> findTop50ByStatusOrderByCreatedAtAsc(String status);

    /**
     * Locks and returns a single still-PENDING event by id using PostgreSQL
     * {@code FOR UPDATE SKIP LOCKED} (the {@code jakarta.persistence.lock.timeout = -2}
     * hint maps to Hibernate's {@code LockOptions.SKIP_LOCKED}). This makes the poller
     * safe to run on multiple pods: if another instance already holds the row lock this
     * returns empty instead of blocking, so the same event is never dispatched twice.
     * The {@code status = 'PENDING'} predicate additionally skips rows a peer already
     * finished. Must be called inside the processing transaction so the lock is held
     * until commit.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT e FROM OutboxEvent e WHERE e.id = :id AND e.status = 'PENDING'")
    Optional<OutboxEvent> lockPendingById(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE OutboxEvent e SET e.status = 'FAILED', e.retryCount = e.retryCount + 1, e.lastError = :error WHERE e.id = :id")
    void markFailed(@Param("id") UUID id, @Param("error") String error);
}
