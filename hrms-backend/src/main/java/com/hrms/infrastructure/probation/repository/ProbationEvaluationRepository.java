package com.hrms.infrastructure.probation.repository;

import com.hrms.domain.probation.ProbationEvaluation;
import com.hrms.domain.probation.ProbationEvaluation.EvaluationType;
import org.springframework.data.domain.Page;
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
public interface ProbationEvaluationRepository extends JpaRepository<ProbationEvaluation, UUID> {

    // Basic tenant-aware queries
    Optional<ProbationEvaluation> findByIdAndTenantId(UUID id, UUID tenantId);

    // Find by probation period
    List<ProbationEvaluation> findByProbationPeriodIdAndTenantIdOrderByEvaluationDateDesc(
            UUID probationPeriodId, UUID tenantId);

    Page<ProbationEvaluation> findByProbationPeriodIdAndTenantIdOrderByEvaluationDateDesc(
            UUID probationPeriodId, UUID tenantId, Pageable pageable);

    // Find by evaluator
    Page<ProbationEvaluation> findByEvaluatorIdAndTenantIdOrderByEvaluationDateDesc(
            UUID evaluatorId, UUID tenantId, Pageable pageable);

    // Find evaluations pending acknowledgment
    @Query("SELECT e FROM ProbationEvaluation e WHERE e.tenantId = :tenantId " +
            "AND e.probationPeriod.employeeId = :employeeId " +
            "AND e.employeeAcknowledged = false " +
            "ORDER BY e.evaluationDate DESC")
    List<ProbationEvaluation> findPendingAcknowledgment(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId);

    // Find by type
    List<ProbationEvaluation> findByProbationPeriodIdAndTenantIdAndEvaluationType(
            UUID probationPeriodId, UUID tenantId, EvaluationType evaluationType);

    // Find latest evaluation for a probation
    @Query("SELECT e FROM ProbationEvaluation e WHERE e.tenantId = :tenantId " +
            "AND e.probationPeriod.id = :probationPeriodId " +
            "ORDER BY e.evaluationDate DESC LIMIT 1")
    Optional<ProbationEvaluation> findLatestEvaluation(
            @Param("tenantId") UUID tenantId,
            @Param("probationPeriodId") UUID probationPeriodId);

    // Count evaluations for a probation
    long countByProbationPeriodIdAndTenantId(UUID probationPeriodId, UUID tenantId);

    // Find evaluations in date range
    @Query("SELECT e FROM ProbationEvaluation e WHERE e.tenantId = :tenantId " +
            "AND e.evaluationDate BETWEEN :startDate AND :endDate " +
            "ORDER BY e.evaluationDate DESC")
    Page<ProbationEvaluation> findByDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    // Average rating for a probation period
    @Query("SELECT AVG(e.overallRating) FROM ProbationEvaluation e " +
            "WHERE e.tenantId = :tenantId " +
            "AND e.probationPeriod.id = :probationPeriodId " +
            "AND e.overallRating IS NOT NULL")
    Optional<Double> getAverageRatingForProbation(
            @Param("tenantId") UUID tenantId,
            @Param("probationPeriodId") UUID probationPeriodId);
}
