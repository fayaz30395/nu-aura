package com.hrms.infrastructure.survey.repository;

import com.hrms.domain.survey.SurveyQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, UUID> {

    Optional<SurveyQuestion> findByIdAndTenantId(UUID id, UUID tenantId);

    List<SurveyQuestion> findBySurveyIdOrderByQuestionOrderAsc(UUID surveyId);

    @Query("SELECT q FROM SurveyQuestion q WHERE q.tenantId = :tenantId " +
            "AND q.survey.id = :surveyId AND q.isRequired = true " +
            "ORDER BY q.questionOrder")
    List<SurveyQuestion> findRequiredQuestions(
            @Param("tenantId") UUID tenantId,
            @Param("surveyId") UUID surveyId);

    @Query("SELECT q FROM SurveyQuestion q WHERE q.tenantId = :tenantId " +
            "AND q.engagementCategory = :category")
    List<SurveyQuestion> findByEngagementCategory(
            @Param("tenantId") UUID tenantId,
            @Param("category") SurveyQuestion.EngagementCategory category);

    @Query("SELECT COUNT(q) FROM SurveyQuestion q WHERE q.survey.id = :surveyId")
    int countBySurveyId(@Param("surveyId") UUID surveyId);

    @Query("SELECT q.engagementCategory, COUNT(q) FROM SurveyQuestion q " +
            "WHERE q.survey.id = :surveyId AND q.engagementCategory IS NOT NULL " +
            "GROUP BY q.engagementCategory")
    List<Object[]> countByEngagementCategory(@Param("surveyId") UUID surveyId);
}
