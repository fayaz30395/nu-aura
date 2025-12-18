package com.hrms.infrastructure.survey.repository;

import com.hrms.domain.survey.SurveyAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SurveyAnswerRepository extends JpaRepository<SurveyAnswer, UUID> {

    List<SurveyAnswer> findByResponseId(UUID responseId);

    List<SurveyAnswer> findByQuestionId(UUID questionId);

    @Query("SELECT a FROM SurveyAnswer a WHERE a.tenantId = :tenantId " +
           "AND a.question.id = :questionId AND a.response.status = 'COMPLETED'")
    List<SurveyAnswer> findCompletedAnswersForQuestion(
            @Param("tenantId") UUID tenantId,
            @Param("questionId") UUID questionId);

    @Query("SELECT a.selectedOption, COUNT(a) FROM SurveyAnswer a " +
           "WHERE a.question.id = :questionId AND a.selectedOption IS NOT NULL " +
           "GROUP BY a.selectedOption")
    List<Object[]> countBySelectedOption(@Param("questionId") UUID questionId);

    @Query("SELECT AVG(a.ratingAnswer) FROM SurveyAnswer a " +
           "WHERE a.question.id = :questionId AND a.ratingAnswer IS NOT NULL")
    Double getAverageRating(@Param("questionId") UUID questionId);

    @Query("SELECT AVG(a.npsScore) FROM SurveyAnswer a " +
           "WHERE a.question.id = :questionId AND a.npsScore IS NOT NULL")
    Double getAverageNps(@Param("questionId") UUID questionId);

    @Query("SELECT AVG(a.sentimentScore) FROM SurveyAnswer a " +
           "WHERE a.question.id = :questionId AND a.sentimentScore IS NOT NULL")
    Double getAverageSentiment(@Param("questionId") UUID questionId);

    @Query("SELECT a.sentimentLevel, COUNT(a) FROM SurveyAnswer a " +
           "WHERE a.question.id = :questionId AND a.sentimentLevel IS NOT NULL " +
           "GROUP BY a.sentimentLevel")
    List<Object[]> countBySentimentLevel(@Param("questionId") UUID questionId);

    @Query("SELECT a FROM SurveyAnswer a WHERE a.question.id = :questionId " +
           "AND a.textAnswer IS NOT NULL AND a.textAnswer <> '' " +
           "ORDER BY a.answeredAt DESC")
    List<SurveyAnswer> findTextAnswers(@Param("questionId") UUID questionId);

    @Query("SELECT a.numericAnswer, COUNT(a) FROM SurveyAnswer a " +
           "WHERE a.question.id = :questionId AND a.numericAnswer IS NOT NULL " +
           "GROUP BY a.numericAnswer ORDER BY a.numericAnswer")
    List<Object[]> getNumericDistribution(@Param("questionId") UUID questionId);
}
