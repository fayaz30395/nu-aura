package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, UUID> {

    Optional<QuizQuestion> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT q FROM QuizQuestion q WHERE q.quizId = :quizId AND q.tenantId = :tenantId ORDER BY q.orderIndex ASC")
    List<QuizQuestion> findByQuizIdAndTenantIdOrderByOrderIndexAsc(
            @Param("quizId") UUID quizId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(q) FROM QuizQuestion q WHERE q.quizId = :quizId AND q.tenantId = :tenantId")
    long countByQuizIdAndTenantId(
            @Param("quizId") UUID quizId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(q.points) FROM QuizQuestion q WHERE q.quizId = :quizId AND q.tenantId = :tenantId")
    Integer getTotalPointsByQuizId(
            @Param("quizId") UUID quizId,
            @Param("tenantId") UUID tenantId);

    @Query("DELETE FROM QuizQuestion q WHERE q.quizId = :quizId")
    void deleteAllByQuizId(@Param("quizId") UUID quizId);
}
