package com.hrms.infrastructure.recognition.repository;

import com.hrms.domain.survey.SurveyResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RecognitionSurveyResponseRepository extends JpaRepository<SurveyResponse, UUID> {

    Optional<SurveyResponse> findBySurveyIdAndEmployeeId(UUID surveyId, UUID employeeId);

    List<SurveyResponse> findBySurveyIdAndTenantId(UUID surveyId, UUID tenantId);

    boolean existsBySurveyIdAndEmployeeId(UUID surveyId, UUID employeeId);

    @Query("SELECT COUNT(r) FROM SurveyResponse r WHERE r.survey.id = :surveyId")
    long countBySurvey(@Param("surveyId") UUID surveyId);

    @Query("SELECT AVG(r.engagementScore) FROM SurveyResponse r WHERE r.survey.id = :surveyId")
    Double getAverageEngagementScore(@Param("surveyId") UUID surveyId);

    @Query("SELECT AVG(r.sentimentScore) FROM SurveyResponse r WHERE r.survey.id = :surveyId")
    Double getAverageSatisfactionScore(@Param("surveyId") UUID surveyId);
}
