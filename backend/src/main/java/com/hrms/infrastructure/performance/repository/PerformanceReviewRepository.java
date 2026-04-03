package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.PerformanceReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PerformanceReviewRepository extends JpaRepository<PerformanceReview, UUID> {

    Optional<PerformanceReview> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<PerformanceReview> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<PerformanceReview> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<PerformanceReview> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    List<PerformanceReview> findAllByTenantIdAndReviewerId(UUID tenantId, UUID reviewerId);

    List<PerformanceReview> findAllByTenantIdAndReviewCycleId(UUID tenantId, UUID reviewCycleId);

    List<PerformanceReview> findByTenantIdAndReviewCycleId(UUID tenantId, UUID reviewCycleId);

    List<PerformanceReview> findByTenantId(UUID tenantId);

    @Query("SELECT pr FROM PerformanceReview pr WHERE pr.tenantId = :tenantId AND pr.reviewPeriodStart BETWEEN :startDate AND :endDate")
    List<PerformanceReview> findByTenantIdAndReviewDateBetween(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate
    );

    @Query("SELECT pr FROM PerformanceReview pr WHERE pr.tenantId = :tenantId " +
            "AND pr.status IN ('DRAFT', 'SUBMITTED') AND pr.reviewerId = :reviewerId")
    List<PerformanceReview> findPendingReviews(@Param("tenantId") UUID tenantId,
                                               @Param("reviewerId") UUID reviewerId);

    @Query("SELECT pr FROM PerformanceReview pr WHERE pr.tenantId = :tenantId " +
            "AND pr.status IN ('DRAFT', 'SUBMITTED') AND pr.reviewerId = :reviewerId")
    Page<PerformanceReview> findPendingReviews(@Param("tenantId") UUID tenantId,
                                               @Param("reviewerId") UUID reviewerId,
                                               Pageable pageable);

    @Query("SELECT AVG(pr.overallRating) FROM PerformanceReview pr " +
            "WHERE pr.tenantId = :tenantId AND pr.employeeId = :employeeId AND pr.status = 'COMPLETED'")
    Double getAverageRating(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    long countByTenantIdAndStatus(UUID tenantId, PerformanceReview.ReviewStatus status);
}
