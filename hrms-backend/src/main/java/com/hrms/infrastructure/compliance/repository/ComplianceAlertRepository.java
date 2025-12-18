package com.hrms.infrastructure.compliance.repository;

import com.hrms.domain.compliance.ComplianceAlert;
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
public interface ComplianceAlertRepository extends JpaRepository<ComplianceAlert, UUID> {

    Optional<ComplianceAlert> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ComplianceAlert> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT a FROM ComplianceAlert a WHERE a.tenantId = :tenantId AND a.status IN ('OPEN', 'IN_PROGRESS', 'ESCALATED') ORDER BY a.priority DESC, a.dueDate ASC")
    List<ComplianceAlert> findActiveAlerts(@Param("tenantId") UUID tenantId);

    @Query("SELECT a FROM ComplianceAlert a WHERE a.tenantId = :tenantId AND a.assignedTo = :assignedTo AND a.status IN ('OPEN', 'IN_PROGRESS') ORDER BY a.dueDate ASC")
    List<ComplianceAlert> findByAssignee(@Param("tenantId") UUID tenantId, @Param("assignedTo") UUID assignedTo);

    @Query("SELECT a FROM ComplianceAlert a WHERE a.tenantId = :tenantId AND a.status = 'OPEN' AND a.dueDate <= :date")
    List<ComplianceAlert> findOverdueAlerts(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT a FROM ComplianceAlert a WHERE a.tenantId = :tenantId AND a.priority IN ('HIGH', 'CRITICAL') AND a.status IN ('OPEN', 'IN_PROGRESS')")
    List<ComplianceAlert> findCriticalAlerts(@Param("tenantId") UUID tenantId);

    @Query("SELECT a.status, COUNT(a) FROM ComplianceAlert a WHERE a.tenantId = :tenantId GROUP BY a.status")
    List<Object[]> countByStatus(@Param("tenantId") UUID tenantId);

    @Query("SELECT a.type, COUNT(a) FROM ComplianceAlert a WHERE a.tenantId = :tenantId AND a.status IN ('OPEN', 'IN_PROGRESS') GROUP BY a.type")
    List<Object[]> countByType(@Param("tenantId") UUID tenantId);
}
