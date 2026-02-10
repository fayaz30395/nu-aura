package com.hrms.infrastructure.helpdesk.repository;

import com.hrms.domain.helpdesk.Ticket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID>, JpaSpecificationExecutor<Ticket> {

    Optional<Ticket> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Ticket> findByTicketNumberAndTenantId(String ticketNumber, UUID tenantId);

    List<Ticket> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<Ticket> findByTenantIdAndCategoryId(UUID tenantId, UUID categoryId);

    List<Ticket> findByTenantIdAndStatus(UUID tenantId, Ticket.TicketStatus status);

    List<Ticket> findByTenantIdAndAssignedTo(UUID tenantId, UUID assignedTo);

    List<Ticket> findByTenantIdAndPriority(UUID tenantId, Ticket.TicketPriority priority);

    // Paginated versions for large datasets
    Page<Ticket> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Ticket> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    Page<Ticket> findByTenantIdAndCategoryId(UUID tenantId, UUID categoryId, Pageable pageable);

    Page<Ticket> findByTenantIdAndStatus(UUID tenantId, Ticket.TicketStatus status, Pageable pageable);

    Page<Ticket> findByTenantIdAndAssignedTo(UUID tenantId, UUID assignedTo, Pageable pageable);

    Page<Ticket> findByTenantIdAndPriority(UUID tenantId, Ticket.TicketPriority priority, Pageable pageable);
}
