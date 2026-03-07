package com.hrms.infrastructure.lms.repository;

import com.hrms.domain.lms.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    Optional<QuizAttempt> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT a FROM QuizAttempt a WHERE a.quizId = :quizId AND a.employeeId = :employeeId AND a.tenantId = :tenantId ORDER BY a.attemptNumber DESC")
    List<QuizAttempt> findByQuizIdAndEmployeeIdAndTenantId(
            @Param("quizId") UUID quizId,
            @Param("employeeId") UUID employeeId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(a) FROM QuizAttempt a WHERE a.quizId = :quizId AND a.employeeId = :employeeId AND a.tenantId = :tenantId")
    long countByQuizIdAndEmployeeIdAndTenantId(
            @Param("quizId") UUID quizId,
            @Param("employeeId") UUID employeeId,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT a FROM QuizAttempt a WHERE a.enrollmentId = :enrollmentId AND a.tenantId = :tenantId")
    List<QuizAttempt> findByEnrollmentIdAndTenantId(
            @Param("enrollmentId") UUID enrollmentId,
            @Param("tenantId") UUID tenantId);
}
