package com.hrms.infrastructure.survey.repository;

import com.hrms.domain.survey.SurveyResponse;
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
public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, UUID> {

    Optional<SurveyResponse> findByIdAndTenantId(UUID id, UUID tenantId);

    List<SurveyResponse> findBySurveyIdAndStatus(UUID surveyId, SurveyResponse.ResponseStatus status);

    Page<SurveyResponse> findBySurveyId(UUID surveyId, Pageable pageable);

    @Query("SELECT r FROM SurveyResponse r WHERE r.tenantId = :tenantId " +
            "AND r.survey.id = :surveyId AND r.status = 'COMPLETED'")
    List<SurveyResponse> findCompletedResponses(
            @Param("tenantId") UUID tenantId,
            @Param("surveyId") UUID surveyId);

    @Query("SELECT r FROM SurveyResponse r WHERE r.tenantId = :tenantId " +
            "AND r.employeeId = :employeeId AND r.survey.id = :surveyId")
    Optional<SurveyResponse> findByEmployeeAndSurvey(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("surveyId") UUID surveyId);

    @Query("SELECT COUNT(r) FROM SurveyResponse r WHERE r.survey.id = :surveyId " +
            "AND r.status = 'COMPLETED'")
    long countCompletedResponses(@Param("surveyId") UUID surveyId);

    @Query("SELECT AVG(r.engagementScore) FROM SurveyResponse r " +
            "WHERE r.survey.id = :surveyId AND r.engagementScore IS NOT NULL")
    Double getAverageEngagementScore(@Param("surveyId") UUID surveyId);

    @Query("SELECT AVG(r.npsScore) FROM SurveyResponse r " +
            "WHERE r.survey.id = :surveyId AND r.npsScore IS NOT NULL")
    Double getAverageNpsScore(@Param("surveyId") UUID surveyId);

    @Query("SELECT r.overallSentiment, COUNT(r) FROM SurveyResponse r " +
            "WHERE r.survey.id = :surveyId AND r.overallSentiment IS NOT NULL " +
            "GROUP BY r.overallSentiment")
    List<Object[]> countBySentiment(@Param("surveyId") UUID surveyId);

    @Query("SELECT r.department, AVG(r.engagementScore) FROM SurveyResponse r " +
            "WHERE r.survey.id = :surveyId AND r.department IS NOT NULL " +
            "GROUP BY r.department")
    List<Object[]> getEngagementByDepartment(@Param("surveyId") UUID surveyId);

    @Query("SELECT r FROM SurveyResponse r WHERE r.tenantId = :tenantId " +
            "AND r.survey.id = :surveyId AND r.department = :department " +
            "AND r.status = 'COMPLETED'")
    List<SurveyResponse> findByDepartment(
            @Param("tenantId") UUID tenantId,
            @Param("surveyId") UUID surveyId,
            @Param("department") String department);

    @Query("SELECT AVG(r.completionTimeMinutes) FROM SurveyResponse r " +
            "WHERE r.survey.id = :surveyId AND r.status = 'COMPLETED'")
    Double getAverageCompletionTime(@Param("surveyId") UUID surveyId);
}
