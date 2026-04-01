package com.hrms.infrastructure.compliance.repository;

import com.hrms.domain.compliance.ComplianceChecklist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ComplianceChecklistRepository extends JpaRepository<ComplianceChecklist, UUID> {

    Optional<ComplianceChecklist> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ComplianceChecklist> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT c FROM ComplianceChecklist c WHERE c.tenantId = :tenantId AND c.isActive = true AND c.status != 'COMPLETED' ORDER BY c.nextDueDate ASC")
    List<ComplianceChecklist> findActiveChecklists(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM ComplianceChecklist c WHERE c.tenantId = :tenantId AND c.isActive = true AND c.status != 'COMPLETED' ORDER BY c.nextDueDate ASC")
    Page<ComplianceChecklist> findActiveChecklists(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT c FROM ComplianceChecklist c WHERE c.tenantId = :tenantId AND c.assignedTo = :assignedTo AND c.status IN ('NOT_STARTED', 'IN_PROGRESS')")
    List<ComplianceChecklist> findByAssignee(@Param("tenantId") UUID tenantId, @Param("assignedTo") UUID assignedTo);

    @Query("SELECT c FROM ComplianceChecklist c WHERE c.tenantId = :tenantId AND c.assignedTo = :assignedTo AND c.status IN ('NOT_STARTED', 'IN_PROGRESS')")
    Page<ComplianceChecklist> findByAssignee(@Param("tenantId") UUID tenantId, @Param("assignedTo") UUID assignedTo, Pageable pageable);

    @Query("SELECT c FROM ComplianceChecklist c WHERE c.tenantId = :tenantId AND c.nextDueDate <= :date AND c.status != 'COMPLETED'")
    List<ComplianceChecklist> findOverdueChecklists(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT c FROM ComplianceChecklist c WHERE c.tenantId = :tenantId AND c.nextDueDate <= :date AND c.status != 'COMPLETED'")
    Page<ComplianceChecklist> findOverdueChecklists(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date, Pageable pageable);

    @Query("SELECT c FROM ComplianceChecklist c WHERE c.tenantId = :tenantId AND c.category = :category")
    List<ComplianceChecklist> findByCategory(@Param("tenantId") UUID tenantId, @Param("category") ComplianceChecklist.ChecklistCategory category);
}
