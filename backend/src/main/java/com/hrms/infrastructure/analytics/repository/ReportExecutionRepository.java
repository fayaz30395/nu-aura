package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.ReportExecution;
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
public interface ReportExecutionRepository extends JpaRepository<ReportExecution, UUID> {

    Optional<ReportExecution> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ReportExecution> findAllByTenantId(UUID tenantId, Pageable pageable);

    /**
     * Find executions for a specific scheduled report.
     */
    List<ReportExecution> findByScheduledReportIdOrderByStartedAtDesc(UUID scheduledReportId);

    /**
     * Find executions for a specific scheduled report with pagination.
     */
    Page<ReportExecution> findByScheduledReportIdAndTenantId(UUID scheduledReportId, UUID tenantId, Pageable pageable);

    /**
     * Find executions by report definition.
     */
    List<ReportExecution> findByReportDefinitionIdAndTenantIdOrderByStartedAtDesc(UUID reportDefinitionId, UUID tenantId);

    /**
     * Find executions by status.
     */
    List<ReportExecution> findByTenantIdAndStatus(UUID tenantId, ReportExecution.ExecutionStatus status);

    /**
     * Find recent executions within a time window.
     */
    @Query("SELECT re FROM ReportExecution re WHERE re.tenantId = :tenantId AND re.startedAt >= :since ORDER BY re.startedAt DESC")
    List<ReportExecution> findRecentExecutions(@Param("tenantId") UUID tenantId, @Param("since") LocalDateTime since);

    /**
     * Count executions by status for a tenant.
     */
    long countByTenantIdAndStatus(UUID tenantId, ReportExecution.ExecutionStatus status);

    /**
     * Find failed executions that can be retried (within last 24 hours).
     */
    @Query("SELECT re FROM ReportExecution re WHERE re.status = 'FAILED' AND re.startedAt >= :since")
    List<ReportExecution> findFailedExecutionsSince(@Param("since") LocalDateTime since);

    /**
     * Get execution statistics for a scheduled report.
     */
    @Query("SELECT COUNT(re), SUM(CASE WHEN re.status = 'COMPLETED' THEN 1 ELSE 0 END), AVG(re.executionTimeMs) " +
           "FROM ReportExecution re WHERE re.scheduledReportId = :scheduledReportId")
    Object[] getExecutionStatistics(@Param("scheduledReportId") UUID scheduledReportId);
}
