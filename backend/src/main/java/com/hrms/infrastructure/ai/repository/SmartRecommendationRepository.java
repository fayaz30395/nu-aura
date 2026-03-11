package com.hrms.infrastructure.ai.repository;

import com.hrms.domain.ai.SmartRecommendation;
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
public interface SmartRecommendationRepository extends JpaRepository<SmartRecommendation, UUID> {

    Optional<SmartRecommendation> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<SmartRecommendation> findByTenantId(UUID tenantId, Pageable pageable);

    List<SmartRecommendation> findByTargetIdAndTenantId(UUID targetId, UUID tenantId);

    List<SmartRecommendation> findByTenantIdAndTargetTypeAndTargetId(
            UUID tenantId, SmartRecommendation.TargetType targetType, UUID targetId);

    List<SmartRecommendation> findByTenantIdAndRecommendationType(
            UUID tenantId, SmartRecommendation.RecommendationType recommendationType);

    @Query("SELECT sr FROM SmartRecommendation sr WHERE sr.tenantId = :tenantId " +
           "AND sr.targetType = :targetType AND sr.targetId = :targetId " +
           "AND sr.isActedUpon = false AND (sr.expiresAt IS NULL OR sr.expiresAt > CURRENT_TIMESTAMP) " +
           "ORDER BY sr.priority DESC, sr.confidenceScore DESC")
    List<SmartRecommendation> findActiveRecommendations(
            @Param("tenantId") UUID tenantId,
            @Param("targetType") SmartRecommendation.TargetType targetType,
            @Param("targetId") UUID targetId);
}
