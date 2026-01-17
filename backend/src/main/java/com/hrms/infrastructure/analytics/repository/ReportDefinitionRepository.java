package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.ReportDefinition;
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
public interface ReportDefinitionRepository extends JpaRepository<ReportDefinition, UUID> {

    Optional<ReportDefinition> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<ReportDefinition> findByReportCodeAndTenantId(String reportCode, UUID tenantId);

    /**
     * Find report definition by report code (case-insensitive) for a tenant.
     * This allows matching reportType from ScheduledReportRequest to ReportDefinition.
     */
    @Query("SELECT rd FROM ReportDefinition rd WHERE UPPER(rd.reportCode) = UPPER(:reportCode) AND rd.tenantId = :tenantId AND rd.isActive = true")
    Optional<ReportDefinition> findActiveByReportCodeIgnoreCase(@Param("reportCode") String reportCode, @Param("tenantId") UUID tenantId);

    /**
     * Find report definition by category for a tenant.
     */
    @Query("SELECT rd FROM ReportDefinition rd WHERE rd.category = :category AND rd.tenantId = :tenantId AND rd.isActive = true")
    List<ReportDefinition> findActiveByCategory(@Param("category") ReportDefinition.ReportCategory category, @Param("tenantId") UUID tenantId);

    Page<ReportDefinition> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<ReportDefinition> findByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    List<ReportDefinition> findByTenantIdAndIsSystemReport(UUID tenantId, Boolean isSystemReport);

    long countByTenantId(UUID tenantId);

    boolean existsByReportCodeAndTenantId(String reportCode, UUID tenantId);
}
