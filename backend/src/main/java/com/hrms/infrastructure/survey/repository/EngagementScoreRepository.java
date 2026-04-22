package com.hrms.infrastructure.survey.repository;

import com.hrms.domain.survey.EngagementScore;
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
public interface EngagementScoreRepository extends JpaRepository<EngagementScore, UUID> {

    Optional<EngagementScore> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT e FROM EngagementScore e WHERE e.tenantId = :tenantId " +
            "AND e.scoreLevel = 'ORGANIZATION' ORDER BY e.scoreDate DESC")
    List<EngagementScore> findOrganizationScores(
            @Param("tenantId") UUID tenantId,
            Pageable pageable);

    @Query("SELECT e FROM EngagementScore e WHERE e.tenantId = :tenantId " +
            "AND e.scoreLevel = 'ORGANIZATION' " +
            "AND e.scoreDate = (SELECT MAX(e2.scoreDate) FROM EngagementScore e2 " +
            "WHERE e2.tenantId = :tenantId AND e2.scoreLevel = 'ORGANIZATION')")
    Optional<EngagementScore> findLatestOrganizationScore(@Param("tenantId") UUID tenantId);

    @Query("SELECT e FROM EngagementScore e WHERE e.tenantId = :tenantId " +
            "AND e.departmentId = :departmentId " +
            "ORDER BY e.scoreDate DESC")
    List<EngagementScore> findByDepartment(
            @Param("tenantId") UUID tenantId,
            @Param("departmentId") UUID departmentId);

    @Query("SELECT e FROM EngagementScore e WHERE e.tenantId = :tenantId " +
            "AND e.scoreDate BETWEEN :startDate AND :endDate " +
            "ORDER BY e.scoreDate")
    List<EngagementScore> findByDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT e FROM EngagementScore e WHERE e.tenantId = :tenantId " +
            "AND e.survey.id = :surveyId")
    List<EngagementScore> findBySurvey(
            @Param("tenantId") UUID tenantId,
            @Param("surveyId") UUID surveyId);

    @Query("SELECT e.scoreLevel, AVG(e.overallScore) FROM EngagementScore e " +
            "WHERE e.tenantId = :tenantId AND e.survey.id = :surveyId " +
            "GROUP BY e.scoreLevel")
    List<Object[]> getAverageScoreByLevel(
            @Param("tenantId") UUID tenantId,
            @Param("surveyId") UUID surveyId);

    @Query("SELECT e.departmentId, e.overallScore FROM EngagementScore e " +
            "WHERE e.tenantId = :tenantId AND e.scoreLevel = 'DEPARTMENT' " +
            "AND e.scoreDate = :scoreDate " +
            "ORDER BY e.overallScore DESC")
    List<Object[]> getDepartmentRanking(
            @Param("tenantId") UUID tenantId,
            @Param("scoreDate") LocalDate scoreDate);

    @Query("SELECT e FROM EngagementScore e WHERE e.tenantId = :tenantId " +
            "AND e.scoreLevel = 'DEPARTMENT' " +
            "AND e.overallScore < :threshold")
    List<EngagementScore> findLowEngagementDepartments(
            @Param("tenantId") UUID tenantId,
            @Param("threshold") Double threshold);

    @Query("SELECT AVG(e.npsScore) FROM EngagementScore e " +
            "WHERE e.tenantId = :tenantId AND e.scoreLevel = 'ORGANIZATION' " +
            "AND e.scoreDate BETWEEN :startDate AND :endDate")
    Double getAverageNpsForPeriod(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
