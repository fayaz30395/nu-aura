package com.nulogic.hrms.outbox;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    @Query("SELECT e FROM OutboxEvent e WHERE e.status = :status AND (e.nextRunAt IS NULL OR e.nextRunAt <= CURRENT_TIMESTAMP) ORDER BY e.createdAt")
    List<OutboxEvent> findPendingReady(OutboxStatus status, Pageable pageable);

    Optional<OutboxEvent> findByIdempotencyKey(String idempotencyKey);
}
