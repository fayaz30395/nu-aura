package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.ReviewCompetency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewCompetencyRepository extends JpaRepository<ReviewCompetency, UUID> {

    Optional<ReviewCompetency> findByIdAndTenantId(UUID id, UUID tenantId);

    List<ReviewCompetency> findAllByTenantIdAndReviewId(UUID tenantId, UUID reviewId);

    void deleteAllByReviewId(UUID reviewId);
}
