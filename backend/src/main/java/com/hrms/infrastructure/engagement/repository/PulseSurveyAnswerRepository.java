package com.hrms.infrastructure.engagement.repository;

import com.hrms.domain.engagement.PulseSurveyAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface PulseSurveyAnswerRepository extends JpaRepository<PulseSurveyAnswer, UUID> {

    List<PulseSurveyAnswer> findAllByResponseId(UUID responseId);

    List<PulseSurveyAnswer> findAllBySurveyIdAndQuestionId(UUID surveyId, UUID questionId);

    @Query("SELECT AVG(a.numericValue) FROM PulseSurveyAnswer a " +
            "WHERE a.surveyId = :surveyId AND a.questionId = :questionId AND a.numericValue IS NOT NULL")
    Double getAverageNumericValueByQuestion(@Param("surveyId") UUID surveyId, @Param("questionId") UUID questionId);

    @Query("SELECT a.numericValue, COUNT(a) FROM PulseSurveyAnswer a " +
            "WHERE a.surveyId = :surveyId AND a.questionId = :questionId AND a.numericValue IS NOT NULL " +
            "GROUP BY a.numericValue ORDER BY a.numericValue")
    List<Object[]> getNumericDistribution(@Param("surveyId") UUID surveyId, @Param("questionId") UUID questionId);

    @Query("SELECT a.textValue, COUNT(a) FROM PulseSurveyAnswer a " +
            "WHERE a.surveyId = :surveyId AND a.questionId = :questionId AND a.textValue IS NOT NULL " +
            "GROUP BY a.textValue ORDER BY COUNT(a) DESC")
    List<Object[]> getTextValueDistribution(@Param("surveyId") UUID surveyId, @Param("questionId") UUID questionId);

    @Query("SELECT a.booleanValue, COUNT(a) FROM PulseSurveyAnswer a " +
            "WHERE a.surveyId = :surveyId AND a.questionId = :questionId AND a.booleanValue IS NOT NULL " +
            "GROUP BY a.booleanValue")
    List<Object[]> getBooleanDistribution(@Param("surveyId") UUID surveyId, @Param("questionId") UUID questionId);

    @Query("SELECT COUNT(a) FROM PulseSurveyAnswer a " +
            "WHERE a.surveyId = :surveyId AND a.questionId = :questionId AND a.isSkipped = true")
    Long countSkippedByQuestion(@Param("surveyId") UUID surveyId, @Param("questionId") UUID questionId);

    // NPS calculation: (Promoters - Detractors) / Total * 100
    // Promoters: 9-10, Passives: 7-8, Detractors: 0-6
    @Query("SELECT " +
            "(SUM(CASE WHEN a.numericValue >= 9 THEN 1 ELSE 0 END) - " +
            "SUM(CASE WHEN a.numericValue <= 6 THEN 1 ELSE 0 END)) * 100.0 / COUNT(a) " +
            "FROM PulseSurveyAnswer a WHERE a.surveyId = :surveyId AND a.questionId = :questionId " +
            "AND a.numericValue IS NOT NULL")
    Double calculateNPSScore(@Param("surveyId") UUID surveyId, @Param("questionId") UUID questionId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PulseSurveyAnswer a WHERE a.responseId = :responseId")
    void deleteAllByResponseId(@Param("responseId") UUID responseId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PulseSurveyAnswer a WHERE a.surveyId = :surveyId")
    void deleteAllBySurveyId(@Param("surveyId") UUID surveyId);
}
