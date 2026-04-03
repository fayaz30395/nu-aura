package com.hrms.infrastructure.featureflag;

import com.hrms.domain.featureflag.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Feature Flags.
 * <p>
 * Playbook Reference: Prompt 34 - Feature flags (tenant-level)
 */
@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, UUID> {

    List<FeatureFlag> findByTenantId(UUID tenantId);

    Optional<FeatureFlag> findByTenantIdAndFeatureKey(UUID tenantId, String featureKey);

    List<FeatureFlag> findByTenantIdAndEnabled(UUID tenantId, boolean enabled);

    List<FeatureFlag> findByTenantIdAndCategory(UUID tenantId, String category);

    @Query("SELECT f FROM FeatureFlag f WHERE f.tenantId = :tenantId AND f.featureKey IN :keys")
    List<FeatureFlag> findByTenantIdAndFeatureKeyIn(
            @Param("tenantId") UUID tenantId,
            @Param("keys") List<String> featureKeys);

    boolean existsByTenantIdAndFeatureKey(UUID tenantId, String featureKey);

    @Query("SELECT f.enabled FROM FeatureFlag f WHERE f.tenantId = :tenantId AND f.featureKey = :key")
    Optional<Boolean> isFeatureEnabled(
            @Param("tenantId") UUID tenantId,
            @Param("key") String featureKey);
}
