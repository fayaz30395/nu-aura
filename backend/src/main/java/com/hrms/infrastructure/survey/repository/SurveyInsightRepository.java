package com.hrms.infrastructure.survey.repository;

import com.hrms.domain.survey.SurveyInsight;
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
public interface SurveyInsightRepository extends JpaRepository<SurveyInsight, UUID> {

    Optional<SurveyInsight> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<SurveyInsight> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT i FROM SurveyInsight i WHERE i.tenantId = :tenantId " +
           "AND i.survey.id = :surveyId ORDER BY i.priority, i.generatedAt DESC")
    List<SurveyInsight> findBySurvey(
            @Param("tenantId") UUID tenantId,
            @Param("surveyId") UUID surveyId);

    @Query("SELECT i FROM SurveyInsight i WHERE i.tenantId = :tenantId " +
           "AND i.priority IN ('CRITICAL', 'HIGH') " +
           "AND i.actionStatus = 'NEW' " +
           "ORDER BY i.priority, i.generatedAt DESC")
    List<SurveyInsight> findHighPriorityUnacknowledged(@Param("tenantId") UUID tenantId);

    @Query("SELECT i FROM SurveyInsight i WHERE i.tenantId = :tenantId " +
           "AND i.insightType = :insightType " +
           "ORDER BY i.generatedAt DESC")
    List<SurveyInsight> findByInsightType(
            @Param("tenantId") UUID tenantId,
            @Param("insightType") SurveyInsight.InsightType insightType);

    @Query("SELECT i FROM SurveyInsight i WHERE i.tenantId = :tenantId " +
           "AND i.departmentId = :departmentId " +
           "ORDER BY i.priority, i.generatedAt DESC")
    List<SurveyInsight> findByDepartment(
            @Param("tenantId") UUID tenantId,
            @Param("departmentId") UUID departmentId);

    @Query("SELECT i FROM SurveyInsight i WHERE i.tenantId = :tenantId " +
           "AND i.category = :category " +
           "ORDER BY i.impactScore DESC")
    List<SurveyInsight> findByCategory(
            @Param("tenantId") UUID tenantId,
            @Param("category") com.hrms.domain.survey.SurveyQuestion.EngagementCategory category);

    @Query("SELECT i FROM SurveyInsight i WHERE i.tenantId = :tenantId " +
           "AND i.actionStatus = 'IN_PROGRESS' " +
           "AND i.assignedTo = :assignedTo")
    List<SurveyInsight> findAssignedToUser(
            @Param("tenantId") UUID tenantId,
            @Param("assignedTo") UUID assignedTo);

    @Query("SELECT i.insightType, COUNT(i) FROM SurveyInsight i " +
           "WHERE i.tenantId = :tenantId AND i.survey.id = :surveyId " +
           "GROUP BY i.insightType")
    List<Object[]> countByInsightType(
            @Param("tenantId") UUID tenantId,
            @Param("surveyId") UUID surveyId);

    @Query("SELECT i.priority, COUNT(i) FROM SurveyInsight i " +
           "WHERE i.tenantId = :tenantId " +
           "GROUP BY i.priority")
    List<Object[]> countByPriority(@Param("tenantId") UUID tenantId);

    @Query("SELECT i FROM SurveyInsight i WHERE i.tenantId = :tenantId " +
           "AND i.insightType IN ('ENGAGEMENT_RISK', 'RETENTION_RISK') " +
           "AND i.actionStatus <> 'COMPLETED' " +
           "ORDER BY i.impactScore DESC")
    List<SurveyInsight> findActiveRisks(@Param("tenantId") UUID tenantId);
}
