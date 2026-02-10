package com.hrms.infrastructure.asset.repository;

import com.hrms.domain.asset.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<Asset, UUID>, JpaSpecificationExecutor<Asset> {

    Optional<Asset> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Asset> findByTenantId(UUID tenantId);

    Optional<Asset> findByTenantIdAndAssetCode(UUID tenantId, String assetCode);

    List<Asset> findByTenantIdAndStatus(UUID tenantId, Asset.AssetStatus status);

    List<Asset> findByTenantIdAndCategory(UUID tenantId, Asset.AssetCategory category);

    List<Asset> findByTenantIdAndAssignedTo(UUID tenantId, UUID employeeId);

    boolean existsByTenantIdAndAssetCode(UUID tenantId, String assetCode);

    // Paginated versions for large datasets
    Page<Asset> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Asset> findByTenantIdAndStatus(UUID tenantId, Asset.AssetStatus status, Pageable pageable);

    Page<Asset> findByTenantIdAndCategory(UUID tenantId, Asset.AssetCategory category, Pageable pageable);

    Page<Asset> findByTenantIdAndAssignedTo(UUID tenantId, UUID employeeId, Pageable pageable);
}
