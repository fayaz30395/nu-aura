package com.hrms.application.asset.service;

import com.hrms.api.asset.dto.AssetRequest;
import com.hrms.api.asset.dto.AssetResponse;
import com.hrms.domain.asset.Asset;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.asset.repository.AssetRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AssetManagementService {

    private final AssetRepository assetRepository;
    private final EmployeeRepository employeeRepository;

    public AssetResponse createAsset(AssetRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating asset {} for tenant {}", request.getAssetCode(), tenantId);

        if (assetRepository.existsByTenantIdAndAssetCode(tenantId, request.getAssetCode())) {
            throw new IllegalArgumentException("Asset with code " + request.getAssetCode() + " already exists");
        }

        Asset asset = new Asset();
        asset.setId(UUID.randomUUID());
        asset.setTenantId(tenantId);
        asset.setAssetCode(request.getAssetCode());
        asset.setAssetName(request.getAssetName());
        asset.setCategory(request.getCategory());
        asset.setBrand(request.getBrand());
        asset.setModel(request.getModel());
        asset.setSerialNumber(request.getSerialNumber());
        asset.setPurchaseDate(request.getPurchaseDate());
        asset.setPurchaseCost(request.getPurchaseCost());
        asset.setCurrentValue(request.getCurrentValue());
        asset.setStatus(request.getStatus() != null ? request.getStatus() : Asset.AssetStatus.AVAILABLE);
        asset.setAssignedTo(request.getAssignedTo());
        asset.setLocation(request.getLocation());
        asset.setWarrantyExpiry(request.getWarrantyExpiry());
        asset.setNotes(request.getNotes());

        Asset savedAsset = assetRepository.save(asset);
        return mapToAssetResponse(savedAsset);
    }

    public AssetResponse updateAsset(UUID assetId, AssetRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating asset {} for tenant {}", assetId, tenantId);

        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        asset.setAssetName(request.getAssetName());
        asset.setCategory(request.getCategory());
        asset.setBrand(request.getBrand());
        asset.setModel(request.getModel());
        asset.setSerialNumber(request.getSerialNumber());
        asset.setPurchaseDate(request.getPurchaseDate());
        asset.setPurchaseCost(request.getPurchaseCost());
        asset.setCurrentValue(request.getCurrentValue());
        asset.setStatus(request.getStatus());
        asset.setAssignedTo(request.getAssignedTo());
        asset.setLocation(request.getLocation());
        asset.setWarrantyExpiry(request.getWarrantyExpiry());
        asset.setNotes(request.getNotes());

        Asset updatedAsset = assetRepository.save(asset);
        return mapToAssetResponse(updatedAsset);
    }

    public AssetResponse assignAsset(UUID assetId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Assigning asset {} to employee {} for tenant {}", assetId, employeeId, tenantId);

        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        if (asset.getStatus() != Asset.AssetStatus.AVAILABLE) {
            throw new IllegalArgumentException("Asset is not available for assignment");
        }

        // Verify employee exists
        employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        asset.setAssignedTo(employeeId);
        asset.setStatus(Asset.AssetStatus.ASSIGNED);

        Asset updatedAsset = assetRepository.save(asset);
        return mapToAssetResponse(updatedAsset);
    }

    public AssetResponse returnAsset(UUID assetId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Returning asset {} for tenant {}", assetId, tenantId);

        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        asset.setAssignedTo(null);
        asset.setStatus(Asset.AssetStatus.AVAILABLE);

        Asset updatedAsset = assetRepository.save(asset);
        return mapToAssetResponse(updatedAsset);
    }

    @Transactional(readOnly = true)
    public AssetResponse getAssetById(UUID assetId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
        return mapToAssetResponse(asset);
    }

    @Transactional(readOnly = true)
    public Page<AssetResponse> getAllAssets(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return assetRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToAssetResponse);
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return assetRepository.findByTenantIdAndAssignedTo(tenantId, employeeId).stream()
                .map(this::mapToAssetResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByStatus(Asset.AssetStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return assetRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToAssetResponse)
                .collect(Collectors.toList());
    }

    public void deleteAsset(UUID assetId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
        assetRepository.delete(asset);
    }

    private AssetResponse mapToAssetResponse(Asset asset) {
        String assignedToName = null;
        if (asset.getAssignedTo() != null) {
            assignedToName = employeeRepository.findById(asset.getAssignedTo())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return AssetResponse.builder()
                .id(asset.getId())
                .tenantId(asset.getTenantId())
                .assetCode(asset.getAssetCode())
                .assetName(asset.getAssetName())
                .category(asset.getCategory())
                .brand(asset.getBrand())
                .model(asset.getModel())
                .serialNumber(asset.getSerialNumber())
                .purchaseDate(asset.getPurchaseDate())
                .purchaseCost(asset.getPurchaseCost())
                .currentValue(asset.getCurrentValue())
                .status(asset.getStatus())
                .assignedTo(asset.getAssignedTo())
                .assignedToName(assignedToName)
                .location(asset.getLocation())
                .warrantyExpiry(asset.getWarrantyExpiry())
                .notes(asset.getNotes())
                .createdAt(asset.getCreatedAt())
                .updatedAt(asset.getUpdatedAt())
                .build();
    }
}
