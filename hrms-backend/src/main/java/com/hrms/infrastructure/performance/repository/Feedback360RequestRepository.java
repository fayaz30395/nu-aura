package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.Feedback360Request;
import com.hrms.domain.performance.Feedback360Request.RequestStatus;
import com.hrms.domain.performance.Feedback360Request.ReviewerType;
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
public interface Feedback360RequestRepository extends JpaRepository<Feedback360Request, UUID> {

    Page<Feedback360Request> findAllByTenantIdAndCycleId(UUID tenantId, UUID cycleId, Pageable pageable);

    Optional<Feedback360Request> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT r FROM Feedback360Request r WHERE r.tenantId = :tenantId AND r.reviewerId = :reviewerId AND r.status = 'PENDING'")
    List<Feedback360Request> findPendingReviewsForReviewer(@Param("tenantId") UUID tenantId, @Param("reviewerId") UUID reviewerId);

    @Query("SELECT r FROM Feedback360Request r WHERE r.tenantId = :tenantId AND r.subjectEmployeeId = :subjectId AND r.cycleId = :cycleId")
    List<Feedback360Request> findRequestsForSubject(@Param("tenantId") UUID tenantId, @Param("subjectId") UUID subjectId, @Param("cycleId") UUID cycleId);

    @Query("SELECT COUNT(r) FROM Feedback360Request r WHERE r.tenantId = :tenantId AND r.cycleId = :cycleId AND r.status = :status")
    Long countByStatus(@Param("tenantId") UUID tenantId, @Param("cycleId") UUID cycleId, @Param("status") RequestStatus status);

    List<Feedback360Request> findAllByCycleIdAndReviewerType(UUID cycleId, ReviewerType reviewerType);

    List<Feedback360Request> findAllByTenantIdAndReviewerIdAndStatus(UUID tenantId, UUID reviewerId, RequestStatus status);

    void deleteAllByCycleId(UUID cycleId);
}
