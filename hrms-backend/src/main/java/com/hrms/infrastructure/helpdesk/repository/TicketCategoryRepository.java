package com.hrms.infrastructure.helpdesk.repository;

import com.hrms.domain.helpdesk.TicketCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketCategoryRepository extends JpaRepository<TicketCategory, UUID>, JpaSpecificationExecutor<TicketCategory> {

    Optional<TicketCategory> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TicketCategory> findByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    List<TicketCategory> findByTenantIdOrderByDisplayOrder(UUID tenantId);
}
