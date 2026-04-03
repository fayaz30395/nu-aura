package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.ScheduledReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScheduledReportRepository extends JpaRepository<ScheduledReport, UUID> {

    Optional<ScheduledReport> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ScheduledReport> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<ScheduledReport> findByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    @Query("SELECT sr FROM ScheduledReport sr WHERE sr.isActive = true AND sr.nextRunAt <= :now")
    List<ScheduledReport> findDueForExecution(@Param("now") LocalDateTime now);

    @Query("SELECT sr FROM ScheduledReport sr WHERE sr.tenantId = :tenantId AND sr.reportDefinitionId = :reportDefinitionId")
    List<ScheduledReport> findByTenantIdAndReportDefinitionId(@Param("tenantId") UUID tenantId,
                                                              @Param("reportDefinitionId") UUID reportDefinitionId);

    long countByTenantId(UUID tenantId);

    long countByTenantIdAndIsActive(UUID tenantId, Boolean isActive);
}
