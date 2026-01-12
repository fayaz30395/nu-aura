package com.hrms.infrastructure.probation.repository;

import com.hrms.domain.probation.ProbationPeriod;
import com.hrms.domain.probation.ProbationPeriod.ProbationStatus;
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
public interface ProbationPeriodRepository extends JpaRepository<ProbationPeriod, UUID> {

    // Basic tenant-aware queries
    Page<ProbationPeriod> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    Optional<ProbationPeriod> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<ProbationPeriod> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    // Find active probation for an employee
    Optional<ProbationPeriod> findByEmployeeIdAndTenantIdAndStatusIn(
            UUID employeeId, UUID tenantId, List<ProbationStatus> statuses);

    // Find by status
    Page<ProbationPeriod> findByTenantIdAndStatusOrderByEndDateAsc(
            UUID tenantId, ProbationStatus status, Pageable pageable);

    List<ProbationPeriod> findByTenantIdAndStatusIn(UUID tenantId, List<ProbationStatus> statuses);

    // Find overdue probations (end date passed but still active)
    @Query("SELECT p FROM ProbationPeriod p WHERE p.tenantId = :tenantId " +
            "AND p.status IN ('ACTIVE', 'EXTENDED') " +
            "AND p.endDate < :currentDate " +
            "ORDER BY p.endDate ASC")
    List<ProbationPeriod> findOverdueProbations(
            @Param("tenantId") UUID tenantId,
            @Param("currentDate") LocalDate currentDate);

    // Find probations ending soon
    @Query("SELECT p FROM ProbationPeriod p WHERE p.tenantId = :tenantId " +
            "AND p.status IN ('ACTIVE', 'EXTENDED') " +
            "AND p.endDate BETWEEN :startDate AND :endDate " +
            "ORDER BY p.endDate ASC")
    List<ProbationPeriod> findProbationsEndingSoon(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Find probations with evaluations due
    @Query("SELECT p FROM ProbationPeriod p WHERE p.tenantId = :tenantId " +
            "AND p.status IN ('ACTIVE', 'EXTENDED') " +
            "AND p.nextEvaluationDate <= :currentDate " +
            "ORDER BY p.nextEvaluationDate ASC")
    List<ProbationPeriod> findProbationsWithEvaluationsDue(
            @Param("tenantId") UUID tenantId,
            @Param("currentDate") LocalDate currentDate);

    // Find by manager
    Page<ProbationPeriod> findByTenantIdAndManagerIdOrderByCreatedAtDesc(
            UUID tenantId, UUID managerId, Pageable pageable);

    List<ProbationPeriod> findByTenantIdAndManagerIdAndStatusIn(
            UUID tenantId, UUID managerId, List<ProbationStatus> statuses);

    // Search with multiple filters
    @Query("SELECT p FROM ProbationPeriod p WHERE p.tenantId = :tenantId " +
            "AND (:status IS NULL OR p.status = :status) " +
            "AND (:managerId IS NULL OR p.managerId = :managerId) " +
            "AND (:startDate IS NULL OR p.startDate >= :startDate) " +
            "AND (:endDate IS NULL OR p.endDate <= :endDate) " +
            "ORDER BY p.createdAt DESC")
    Page<ProbationPeriod> searchProbations(
            @Param("tenantId") UUID tenantId,
            @Param("status") ProbationStatus status,
            @Param("managerId") UUID managerId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    // Statistics
    @Query("SELECT p.status, COUNT(p) FROM ProbationPeriod p " +
            "WHERE p.tenantId = :tenantId " +
            "GROUP BY p.status")
    List<Object[]> countByStatus(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(p) FROM ProbationPeriod p " +
            "WHERE p.tenantId = :tenantId " +
            "AND p.status IN ('ACTIVE', 'EXTENDED')")
    long countActiveProbations(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(p) FROM ProbationPeriod p " +
            "WHERE p.tenantId = :tenantId " +
            "AND p.status = 'CONFIRMED' " +
            "AND p.confirmationDate BETWEEN :startDate AND :endDate")
    long countConfirmationsInPeriod(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(p) FROM ProbationPeriod p " +
            "WHERE p.tenantId = :tenantId " +
            "AND p.status IN ('FAILED', 'TERMINATED') " +
            "AND p.terminationDate BETWEEN :startDate AND :endDate")
    long countTerminationsInPeriod(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Check if employee already has an active probation
    boolean existsByEmployeeIdAndTenantIdAndStatusIn(
            UUID employeeId, UUID tenantId, List<ProbationStatus> statuses);
}
