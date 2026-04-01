package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.Feedback360Response;
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
public interface Feedback360ResponseRepository extends JpaRepository<Feedback360Response, UUID> {

    Optional<Feedback360Response> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Feedback360Response> findByRequestIdAndTenantId(UUID requestId, UUID tenantId);

    @Query("SELECT r FROM Feedback360Response r WHERE r.tenantId = :tenantId AND r.subjectEmployeeId = :subjectId AND r.cycleId = :cycleId AND r.isDraft = false")
    List<Feedback360Response> findSubmittedResponsesForSubject(@Param("tenantId") UUID tenantId, @Param("subjectId") UUID subjectId, @Param("cycleId") UUID cycleId);

    @Query("SELECT r FROM Feedback360Response r WHERE r.tenantId = :tenantId AND r.reviewerId = :reviewerId AND r.cycleId = :cycleId")
    List<Feedback360Response> findResponsesByReviewer(@Param("tenantId") UUID tenantId, @Param("reviewerId") UUID reviewerId, @Param("cycleId") UUID cycleId);

    @Query("SELECT COUNT(r) FROM Feedback360Response r WHERE r.tenantId = :tenantId AND r.cycleId = :cycleId AND r.isDraft = false")
    Long countSubmittedResponses(@Param("tenantId") UUID tenantId, @Param("cycleId") UUID cycleId);

    Page<Feedback360Response> findAllByCycleIdAndTenantId(UUID cycleId, UUID tenantId, Pageable pageable);

    void deleteAllByCycleId(UUID cycleId);
}
