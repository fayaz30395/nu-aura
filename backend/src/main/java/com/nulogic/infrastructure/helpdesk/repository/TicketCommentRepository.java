package com.nulogic.infrastructure.helpdesk.repository;

import com.nulogic.domain.helpdesk.TicketComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketCommentRepository extends JpaRepository<TicketComment, UUID>, JpaSpecificationExecutor<TicketComment> {

    Optional<TicketComment> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TicketComment> findByTenantIdAndTicketId(UUID tenantId, UUID ticketId);

    List<TicketComment> findByTenantIdAndCommenterId(UUID tenantId, UUID commenterId);
}
