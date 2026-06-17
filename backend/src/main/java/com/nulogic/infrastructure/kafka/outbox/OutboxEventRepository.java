package com.nulogic.infrastructure.kafka.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    List<OutboxEvent> findTop50ByStatusOrderByCreatedAtAsc(String status);

    @Modifying
    @Query("UPDATE OutboxEvent e SET e.status = 'FAILED', e.retryCount = e.retryCount + 1, e.lastError = :error WHERE e.id = :id")
    void markFailed(@Param("id") UUID id, @Param("error") String error);
}
