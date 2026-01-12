package com.hrms.infrastructure.ai.repository;

import com.hrms.domain.ai.CandidateMatchScore;
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
public interface CandidateMatchScoreRepository extends JpaRepository<CandidateMatchScore, UUID> {

    Optional<CandidateMatchScore> findByCandidateIdAndJobOpeningIdAndTenantId(
            UUID candidateId, UUID jobOpeningId, UUID tenantId);

    List<CandidateMatchScore> findByJobOpeningIdAndTenantIdOrderByOverallMatchScoreDesc(
            UUID jobOpeningId, UUID tenantId);

    Page<CandidateMatchScore> findByJobOpeningIdAndTenantId(
            UUID jobOpeningId, UUID tenantId, Pageable pageable);

    List<CandidateMatchScore> findByCandidateIdAndTenantId(UUID candidateId, UUID tenantId);

    @Query("SELECT cms FROM CandidateMatchScore cms WHERE cms.tenantId = :tenantId " +
           "AND cms.jobOpeningId = :jobOpeningId AND cms.recommendation = :recommendation")
    List<CandidateMatchScore> findByJobAndRecommendation(
            @Param("tenantId") UUID tenantId,
            @Param("jobOpeningId") UUID jobOpeningId,
            @Param("recommendation") CandidateMatchScore.Recommendation recommendation);

    @Query("SELECT cms FROM CandidateMatchScore cms WHERE cms.tenantId = :tenantId " +
           "AND cms.jobOpeningId = :jobOpeningId AND cms.overallMatchScore >= :minScore " +
           "ORDER BY cms.overallMatchScore DESC")
    List<CandidateMatchScore> findTopCandidatesForJob(
            @Param("tenantId") UUID tenantId,
            @Param("jobOpeningId") UUID jobOpeningId,
            @Param("minScore") Double minScore);

    void deleteByJobOpeningIdAndTenantId(UUID jobOpeningId, UUID tenantId);

    void deleteByCandidateIdAndTenantId(UUID candidateId, UUID tenantId);
}
