package com.hrms.infrastructure.helpdesk.repository;

import com.hrms.domain.helpdesk.TicketSLA;
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
public interface TicketSLARepository extends JpaRepository<TicketSLA, UUID> {

    Page<TicketSLA> findAllByTenantId(UUID tenantId, Pageable pageable);

    Optional<TicketSLA> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TicketSLA> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    @Query("SELECT s FROM TicketSLA s WHERE s.tenantId = :tenantId AND s.categoryId = :categoryId AND s.isActive = true")
    Optional<TicketSLA> findByCategoryId(@Param("tenantId") UUID tenantId, @Param("categoryId") UUID categoryId);

    @Query("SELECT s FROM TicketSLA s WHERE s.tenantId = :tenantId AND s.priority = :priority AND s.isActive = true")
    List<TicketSLA> findByPriority(@Param("tenantId") UUID tenantId, @Param("priority") String priority);

    @Query("SELECT s FROM TicketSLA s WHERE s.tenantId = :tenantId AND s.applyToAllCategories = true AND s.isActive = true")
    Optional<TicketSLA> findDefaultSLA(@Param("tenantId") UUID tenantId);
}
