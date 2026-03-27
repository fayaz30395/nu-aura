package com.hrms.infrastructure.engagement.repository;

import com.hrms.domain.engagement.PulseSurveyQuestion;
import com.hrms.domain.engagement.PulseSurveyQuestion.QuestionCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PulseSurveyQuestionRepository extends JpaRepository<PulseSurveyQuestion, UUID> {

    List<PulseSurveyQuestion> findAllBySurveyIdOrderByQuestionOrder(UUID surveyId);

    List<PulseSurveyQuestion> findAllBySurveyIdAndIsActiveTrue(UUID surveyId);

    Optional<PulseSurveyQuestion> findByIdAndSurveyId(UUID id, UUID surveyId);

    @Query("SELECT COALESCE(MAX(q.questionOrder), 0) FROM PulseSurveyQuestion q WHERE q.surveyId = :surveyId")
    Integer getMaxQuestionOrder(@Param("surveyId") UUID surveyId);

    @Query("SELECT COUNT(q) FROM PulseSurveyQuestion q WHERE q.surveyId = :surveyId AND q.isActive = true")
    Integer countActiveQuestions(@Param("surveyId") UUID surveyId);

    List<PulseSurveyQuestion> findAllBySurveyIdAndCategory(UUID surveyId, QuestionCategory category);

    @Modifying
    @Transactional
    @Query("UPDATE PulseSurveyQuestion q SET q.questionOrder = q.questionOrder + 1 " +
            "WHERE q.surveyId = :surveyId AND q.questionOrder >= :fromOrder")
    void shiftQuestionsDown(@Param("surveyId") UUID surveyId, @Param("fromOrder") Integer fromOrder);

    @Modifying
    @Transactional
    @Query("DELETE FROM PulseSurveyQuestion q WHERE q.surveyId = :surveyId")
    void deleteAllBySurveyId(@Param("surveyId") UUID surveyId);
}
