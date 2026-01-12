package com.hrms.infrastructure.analytics.repository;

import com.hrms.domain.analytics.SkillGap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SkillGapRepository extends JpaRepository<SkillGap, UUID> {

    Optional<SkillGap> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT g FROM SkillGap g WHERE g.tenantId = :tenantId " +
           "AND g.analysisDate = (SELECT MAX(g2.analysisDate) FROM SkillGap g2 WHERE g2.tenantId = :tenantId) " +
           "ORDER BY g.gapSeverity DESC")
    List<SkillGap> findLatestGaps(@Param("tenantId") UUID tenantId);

    @Query("SELECT g FROM SkillGap g WHERE g.tenantId = :tenantId AND g.priority = :priority " +
           "AND g.analysisDate >= :fromDate ORDER BY g.gapSeverity DESC")
    List<SkillGap> findByPriority(@Param("tenantId") UUID tenantId,
                                   @Param("priority") SkillGap.Priority priority,
                                   @Param("fromDate") LocalDate fromDate);

    @Query("SELECT g FROM SkillGap g WHERE g.tenantId = :tenantId AND g.departmentId = :departmentId " +
           "AND g.analysisDate >= :fromDate ORDER BY g.gapSeverity DESC")
    List<SkillGap> findByDepartment(@Param("tenantId") UUID tenantId,
                                     @Param("departmentId") UUID departmentId,
                                     @Param("fromDate") LocalDate fromDate);

    @Query("SELECT g FROM SkillGap g WHERE g.tenantId = :tenantId AND g.skillCategory = :category " +
           "ORDER BY g.gapSeverity DESC")
    List<SkillGap> findBySkillCategory(@Param("tenantId") UUID tenantId, @Param("category") String category);

    @Query("SELECT g FROM SkillGap g WHERE g.tenantId = :tenantId AND g.jobFamily = :jobFamily " +
           "AND g.analysisDate >= :fromDate ORDER BY g.gapSeverity DESC")
    List<SkillGap> findByJobFamily(@Param("tenantId") UUID tenantId,
                                    @Param("jobFamily") String jobFamily,
                                    @Param("fromDate") LocalDate fromDate);

    @Query("SELECT g.skillCategory, COUNT(g), SUM(g.gapCount) FROM SkillGap g WHERE g.tenantId = :tenantId " +
           "AND g.analysisDate >= :fromDate GROUP BY g.skillCategory ORDER BY SUM(g.gapCount) DESC")
    List<Object[]> getGapSummaryByCategory(@Param("tenantId") UUID tenantId, @Param("fromDate") LocalDate fromDate);

    @Query("SELECT SUM(g.estimatedTrainingCost) FROM SkillGap g WHERE g.tenantId = :tenantId " +
           "AND g.resolutionStrategy = 'TRAIN' AND g.analysisDate >= :fromDate")
    java.math.BigDecimal getTotalTrainingCostNeeded(@Param("tenantId") UUID tenantId,
                                                     @Param("fromDate") LocalDate fromDate);

    @Query("SELECT SUM(g.estimatedHiringCost) FROM SkillGap g WHERE g.tenantId = :tenantId " +
           "AND g.resolutionStrategy = 'HIRE' AND g.analysisDate >= :fromDate")
    java.math.BigDecimal getTotalHiringCostNeeded(@Param("tenantId") UUID tenantId,
                                                   @Param("fromDate") LocalDate fromDate);

    @Query("SELECT g FROM SkillGap g WHERE g.tenantId = :tenantId " +
           "AND g.priority IN ('HIGH', 'CRITICAL') AND g.trainingAvailable = true " +
           "ORDER BY g.gapSeverity DESC")
    List<SkillGap> findTrainableHighPriorityGaps(@Param("tenantId") UUID tenantId);
}
