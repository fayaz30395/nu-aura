package com.hrms.infrastructure.asset.repository;

import com.hrms.domain.asset.AssetMaintenanceRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssetMaintenanceRequestRepository
        extends JpaRepository<AssetMaintenanceRequest, UUID>,
        JpaSpecificationExecutor<AssetMaintenanceRequest> {

    Page<AssetMaintenanceRequest> findByTenantId(UUID tenantId, Pageable pageable);

    List<AssetMaintenanceRequest> findByAssetId(UUID assetId);

    Page<AssetMaintenanceRequest> findByTenantIdAndStatus(
            UUID tenantId,
            AssetMaintenanceRequest.MaintenanceStatus status,
            Pageable pageable);

    List<AssetMaintenanceRequest> findByTenantIdAndAssetId(UUID tenantId, UUID assetId);

    Page<AssetMaintenanceRequest> findByTenantIdAndPriority(
            UUID tenantId,
            AssetMaintenanceRequest.MaintenancePriority priority,
            Pageable pageable);
}
