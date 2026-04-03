package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.WorkforceTrend;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkforceTrendRepository extends JpaRepository<WorkforceTrend, UUID> {

    Optional<WorkforceTrend> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT t FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.trendType = :trendType AND t.periodYear = :year " +
            "ORDER BY t.periodMonth")
    List<WorkforceTrend> findByYearAndType(@Param("tenantId") UUID tenantId,
                                           @Param("trendType") WorkforceTrend.TrendType trendType,
                                           @Param("year") Integer year);

    @Query("SELECT t FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.trendType = 'ORGANIZATION' " +
            "AND ((t.periodYear = :startYear AND t.periodMonth >= :startMonth) " +
            "OR (t.periodYear > :startYear AND t.periodYear < :endYear) " +
            "OR (t.periodYear = :endYear AND t.periodMonth <= :endMonth)) " +
            "ORDER BY t.periodYear, t.periodMonth")
    List<WorkforceTrend> findOrganizationTrendsBetween(@Param("tenantId") UUID tenantId,
                                                       @Param("startYear") Integer startYear,
                                                       @Param("startMonth") Integer startMonth,
                                                       @Param("endYear") Integer endYear,
                                                       @Param("endMonth") Integer endMonth);

    @Query("SELECT t FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.departmentId = :departmentId AND t.periodYear = :year " +
            "ORDER BY t.periodMonth")
    List<WorkforceTrend> findByDepartmentAndYear(@Param("tenantId") UUID tenantId,
                                                 @Param("departmentId") UUID departmentId,
                                                 @Param("year") Integer year);

    @Query("SELECT t FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.trendType = 'DEPARTMENT' AND t.periodYear = :year AND t.periodMonth = :month " +
            "ORDER BY t.departmentName")
    List<WorkforceTrend> findDepartmentTrendsByMonth(@Param("tenantId") UUID tenantId,
                                                     @Param("year") Integer year,
                                                     @Param("month") Integer month);

    @Query("SELECT t FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.trendType = 'ORGANIZATION' " +
            "ORDER BY t.periodYear DESC, t.periodMonth DESC")
    List<WorkforceTrend> findLatestOrganizationTrend(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(t.newHires) FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.trendType = 'ORGANIZATION' AND t.periodYear = :year")
    Integer getTotalHiresForYear(@Param("tenantId") UUID tenantId, @Param("year") Integer year);

    @Query("SELECT SUM(t.terminations) FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.trendType = 'ORGANIZATION' AND t.periodYear = :year")
    Integer getTotalTerminationsForYear(@Param("tenantId") UUID tenantId, @Param("year") Integer year);

    @Query("SELECT AVG(t.attritionRate) FROM WorkforceTrend t WHERE t.tenantId = :tenantId " +
            "AND t.trendType = 'ORGANIZATION' AND t.periodYear = :year")
    java.math.BigDecimal getAvgAttritionRateForYear(@Param("tenantId") UUID tenantId, @Param("year") Integer year);
}
