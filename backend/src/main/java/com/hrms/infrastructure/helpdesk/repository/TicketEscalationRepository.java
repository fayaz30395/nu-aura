package com.hrms.infrastructure.helpdesk.repository;

import com.hrms.domain.helpdesk.TicketEscalation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketEscalationRepository extends JpaRepository<TicketEscalation, UUID> {

    Optional<TicketEscalation> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TicketEscalation> findAllByTicketIdOrderByEscalatedAtDesc(UUID ticketId);

    Page<TicketEscalation> findAllByTenantIdAndEscalatedTo(UUID tenantId, UUID escalatedTo, Pageable pageable);

    @Query("SELECT e FROM TicketEscalation e WHERE e.tenantId = :tenantId AND e.escalatedTo = :userId AND e.acknowledgedAt IS NULL")
    List<TicketEscalation> findUnacknowledgedForUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(e) FROM TicketEscalation e WHERE e.ticketId = :ticketId")
    Long countByTicket(@Param("ticketId") UUID ticketId);

    void deleteAllByTicketId(UUID ticketId);
}
