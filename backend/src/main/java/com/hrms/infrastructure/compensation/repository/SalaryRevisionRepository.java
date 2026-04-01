package com.hrms.infrastructure.compensation.repository;

import com.hrms.domain.compensation.SalaryRevision;
import com.hrms.domain.compensation.SalaryRevision.RevisionStatus;
import com.hrms.domain.compensation.SalaryRevision.RevisionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SalaryRevisionRepository extends JpaRepository<SalaryRevision, UUID> {

    // Basic tenant-aware queries
    Optional<SalaryRevision> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<SalaryRevision> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    // Find by employee
    List<SalaryRevision> findByEmployeeIdAndTenantIdOrderByEffectiveDateDesc(
            UUID employeeId, UUID tenantId);

    Page<SalaryRevision> findByEmployeeIdAndTenantIdOrderByEffectiveDateDesc(
            UUID employeeId, UUID tenantId, Pageable pageable);

    Optional<SalaryRevision> findFirstByEmployeeIdAndTenantIdAndStatusOrderByEffectiveDateDesc(
            UUID employeeId, UUID tenantId, RevisionStatus status);

    // Find by review cycle
    Page<SalaryRevision> findByReviewCycleIdAndTenantIdOrderByCreatedAtDesc(
            UUID reviewCycleId, UUID tenantId, Pageable pageable);

    List<SalaryRevision> findByReviewCycleIdAndTenantId(UUID reviewCycleId, UUID tenantId);

    // Find by status
    Page<SalaryRevision> findByTenantIdAndStatusOrderByCreatedAtDesc(
            UUID tenantId, RevisionStatus status, Pageable pageable);

    List<SalaryRevision> findByTenantIdAndStatusIn(UUID tenantId, List<RevisionStatus> statuses);

    // Find pending approvals
    @Query("SELECT r FROM SalaryRevision r WHERE r.tenantId = :tenantId " +
            "AND r.status IN ('PENDING_REVIEW', 'REVIEWED', 'PENDING_APPROVAL') " +
            "ORDER BY r.createdAt ASC")
    Page<SalaryRevision> findPendingApprovals(@Param("tenantId") UUID tenantId, Pageable pageable);

    // Search with multiple filters
    @Query("SELECT r FROM SalaryRevision r WHERE r.tenantId = :tenantId " +
            "AND (:status IS NULL OR r.status = :status) " +
            "AND (:revisionType IS NULL OR r.revisionType = :revisionType) " +
            "AND (:reviewCycleId IS NULL OR r.reviewCycleId = :reviewCycleId) " +
            "AND (:effectiveFrom IS NULL OR r.effectiveDate >= :effectiveFrom) " +
            "AND (:effectiveTo IS NULL OR r.effectiveDate <= :effectiveTo) " +
            "ORDER BY r.createdAt DESC")
    Page<SalaryRevision> searchRevisions(
            @Param("tenantId") UUID tenantId,
            @Param("status") RevisionStatus status,
            @Param("revisionType") RevisionType revisionType,
            @Param("reviewCycleId") UUID reviewCycleId,
            @Param("effectiveFrom") LocalDate effectiveFrom,
            @Param("effectiveTo") LocalDate effectiveTo,
            Pageable pageable);

    // Find by proposer
    Page<SalaryRevision> findByTenantIdAndProposedByOrderByCreatedAtDesc(
            UUID tenantId, UUID proposedBy, Pageable pageable);

    // Statistics
    @Query("SELECT r.status, COUNT(r) FROM SalaryRevision r " +
            "WHERE r.tenantId = :tenantId " +
            "AND r.reviewCycleId = :cycleId " +
            "GROUP BY r.status")
    List<Object[]> countByStatusForCycle(
            @Param("tenantId") UUID tenantId,
            @Param("cycleId") UUID cycleId);

    @Query("SELECT COUNT(r) FROM SalaryRevision r " +
            "WHERE r.tenantId = :tenantId " +
            "AND r.reviewCycleId = :cycleId " +
            "AND r.status = :status")
    long countByCycleAndStatus(
            @Param("tenantId") UUID tenantId,
            @Param("cycleId") UUID cycleId,
            @Param("status") RevisionStatus status);

    @Query("SELECT SUM(r.incrementAmount) FROM SalaryRevision r " +
            "WHERE r.tenantId = :tenantId " +
            "AND r.reviewCycleId = :cycleId " +
            "AND r.status IN ('APPROVED', 'APPLIED')")
    BigDecimal getTotalIncrementByCycle(
            @Param("tenantId") UUID tenantId,
            @Param("cycleId") UUID cycleId);

    @Query("SELECT AVG(r.incrementPercentage) FROM SalaryRevision r " +
            "WHERE r.tenantId = :tenantId " +
            "AND r.reviewCycleId = :cycleId " +
            "AND r.status IN ('APPROVED', 'APPLIED') " +
            "AND r.incrementPercentage IS NOT NULL")
    Double getAverageIncrementPercentageByCycle(
            @Param("tenantId") UUID tenantId,
            @Param("cycleId") UUID cycleId);

    // Find revisions effective in date range
    @Query("SELECT r FROM SalaryRevision r WHERE r.tenantId = :tenantId " +
            "AND r.effectiveDate BETWEEN :startDate AND :endDate " +
            "AND r.status = 'APPLIED' " +
            "ORDER BY r.effectiveDate DESC")
    List<SalaryRevision> findAppliedRevisionsInDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Check if employee has pending revision
    boolean existsByEmployeeIdAndTenantIdAndStatusIn(
            UUID employeeId, UUID tenantId, List<RevisionStatus> statuses);

    // Count promotions
    @Query("SELECT COUNT(r) FROM SalaryRevision r " +
            "WHERE r.tenantId = :tenantId " +
            "AND r.reviewCycleId = :cycleId " +
            "AND r.revisionType = 'PROMOTION'")
    long countPromotionsByCycle(
            @Param("tenantId") UUID tenantId,
            @Param("cycleId") UUID cycleId);
}
