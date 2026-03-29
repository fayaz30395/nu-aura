package com.hrms.application.asset.service;

import com.hrms.api.asset.dto.AssetRequest;
import com.hrms.api.asset.dto.AssetResponse;
import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.domain.asset.Asset;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.asset.repository.AssetRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import com.hrms.common.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class AssetManagementService implements ApprovalCallbackHandler {

    private final AssetRepository assetRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkflowService workflowService;
    private final EventPublisher eventPublisher;

    @org.springframework.beans.factory.annotation.Autowired
    public AssetManagementService(
            AssetRepository assetRepository,
            EmployeeRepository employeeRepository,
            @org.springframework.context.annotation.Lazy WorkflowService workflowService,
            EventPublisher eventPublisher) {
        this.assetRepository = assetRepository;
        this.employeeRepository = employeeRepository;
        this.workflowService = workflowService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
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

    @Transactional
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

    @Transactional
    public AssetResponse assignAsset(UUID assetId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Assigning asset {} to employee {} for tenant {}", assetId, employeeId, tenantId);

        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        if (asset.getStatus() != Asset.AssetStatus.AVAILABLE) {
            throw new IllegalArgumentException("Asset is not available for assignment");
        }

        // R2-002 FIX: Verify employee exists AND belongs to the same tenant.
        // Using findById() would allow assigning an asset to an employee from a
        // different tenant — a cross-tenant data leak. findByIdAndTenantId() enforces
        // the tenant boundary before the assignment is persisted.
        employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        asset.setAssignedTo(employeeId);
        asset.setStatus(Asset.AssetStatus.ASSIGNED);

        Asset updatedAsset = assetRepository.save(asset);

        // Publish audit event for asset assignment (best-effort)
        publishAssetAuditEvent(null, "ASSIGN", assetId, tenantId,
                "Asset " + asset.getAssetCode() + " assigned to employee " + employeeId);

        return mapToAssetResponse(updatedAsset);
    }

    @Transactional
    public AssetResponse returnAsset(UUID assetId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Returning asset {} for tenant {}", assetId, tenantId);

        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        asset.setAssignedTo(null);
        asset.setStatus(Asset.AssetStatus.AVAILABLE);

        Asset updatedAsset = assetRepository.save(asset);

        // Publish audit event for asset return (best-effort)
        publishAssetAuditEvent(null, "RETURN", assetId, tenantId,
                "Asset " + asset.getAssetCode() + " returned");

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
    public Page<AssetResponse> getAllAssets(org.springframework.data.jpa.domain.Specification<Asset> spec,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        org.springframework.data.jpa.domain.Specification<Asset> finalSpec = (root, query, cb) -> cb
                .equal(root.get("tenantId"), tenantId);

        if (spec != null) {
            finalSpec = finalSpec.and(spec);
        }

        return assetRepository.findAll(finalSpec, pageable).map(this::mapToAssetResponse);
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Asset> assets = assetRepository.findByTenantIdAndAssignedTo(tenantId, employeeId);
        // Batch-load employee names in a single query to avoid N+1
        Map<UUID, String> nameCache = buildEmployeeNameCache(assets);
        return assets.stream()
                .map(a -> mapToAssetResponse(a, nameCache))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByStatus(Asset.AssetStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Asset> assets = assetRepository.findByTenantIdAndStatus(tenantId, status);
        // Batch-load employee names in a single query to avoid N+1
        Map<UUID, String> nameCache = buildEmployeeNameCache(assets);
        return assets.stream()
                .map(a -> mapToAssetResponse(a, nameCache))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteAsset(UUID assetId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
        assetRepository.delete(asset);

        // Publish audit event for asset deletion (best-effort)
        publishAssetAuditEvent(null, "DELETE", assetId, tenantId,
                "Asset " + asset.getAssetCode() + " deleted");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ApprovalCallbackHandler
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public WorkflowDefinition.EntityType getEntityType() {
        return WorkflowDefinition.EntityType.ASSET_REQUEST;
    }

    @Override
    @Transactional
    public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
        log.info("Asset request {} approved via workflow by {}", entityId, approvedBy);

        Asset asset = assetRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (asset == null) {
            log.warn("Asset {} not found for approval callback", entityId);
            return;
        }

        // Mark asset as assigned if it was pending assignment
        if (asset.getStatus() == Asset.AssetStatus.AVAILABLE && asset.getAssignedTo() != null) {
            asset.setStatus(Asset.AssetStatus.ASSIGNED);
            assetRepository.save(asset);
            log.info("Asset {} assigned to {} after approval", entityId, asset.getAssignedTo());
        }
    }

    @Override
    @Transactional
    public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
        log.info("Asset request {} rejected via workflow by {}: {}", entityId, rejectedBy, reason);

        Asset asset = assetRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (asset == null) {
            log.warn("Asset {} not found for rejection callback", entityId);
            return;
        }

        // Clear the pending assignment
        if (asset.getAssignedTo() != null && asset.getStatus() == Asset.AssetStatus.AVAILABLE) {
            asset.setAssignedTo(null);
            assetRepository.save(asset);
            log.info("Asset {} assignment cleared after rejection", entityId);
        }
    }

    /**
     * Request asset assignment via approval workflow.
     * Sets assignedTo but keeps status as AVAILABLE until approved.
     */
    @Transactional
    public AssetResponse requestAssetAssignment(UUID assetId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Asset asset = assetRepository.findByIdAndTenantId(assetId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        if (asset.getStatus() != Asset.AssetStatus.AVAILABLE) {
            throw new IllegalArgumentException("Asset is not available for assignment");
        }

        employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Set pending assignment (status stays AVAILABLE until workflow approves)
        asset.setAssignedTo(employeeId);
        Asset saved = assetRepository.save(asset);

        // Start workflow
        try {
            String employeeName = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                    .map(Employee::getFullName).orElse("Employee");

            WorkflowExecutionRequest workflowRequest = new WorkflowExecutionRequest();
            workflowRequest.setEntityType(WorkflowDefinition.EntityType.ASSET_REQUEST);
            workflowRequest.setEntityId(assetId);
            workflowRequest.setTitle("Asset Request: " + asset.getAssetName() + " for " + employeeName);
            workflowRequest.setAmount(asset.getPurchaseCost());

            workflowService.startWorkflow(workflowRequest);
            log.info("Workflow started for asset request: {} -> {}", assetId, employeeId);
        } catch (Exception e) {
            log.warn("Could not start approval workflow for asset request {}: {}", assetId, e.getMessage());
        }

        return mapToAssetResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Kafka Event Publishing
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Publishes an audit event for asset operations. Best-effort: logs errors
     * but never fails the business operation.
     */
    private void publishAssetAuditEvent(UUID userId, String action, UUID entityId,
            UUID tenantId, String description) {
        try {
            eventPublisher.publishAuditEvent(
                    userId, action, "Asset", entityId, tenantId,
                    null, null, null, null, null, null, null, null,
                    description);
        } catch (Exception e) {
            log.warn("Failed to publish asset audit event (action={}, entityId={}): {}",
                    action, entityId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapping helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Maps a single {@link Asset} to {@link AssetResponse}, executing one
     * {@code findById} query per call.
     *
     * <p><b>Use only for single-asset operations</b> (e.g., create, update, get-by-id).
     * For list operations use {@link #mapToAssetResponse(Asset, Map)} with a
     * pre-built name cache to avoid N+1 queries.
     */
    private AssetResponse mapToAssetResponse(Asset asset) {
        String assignedToName = null;
        if (asset.getAssignedTo() != null) {
            assignedToName = employeeRepository.findById(asset.getAssignedTo())
                    .map(Employee::getFullName)
                    .orElse(null);
        }
        return buildAssetResponse(asset, assignedToName);
    }

    /**
     * Maps an {@link Asset} to {@link AssetResponse} using a pre-fetched
     * {@code employeeNameCache} (UUID → full name) to avoid N+1 queries in list operations.
     *
     * @param asset           the asset entity to map
     * @param employeeNameCache a map of {@code employeeId → fullName} for all assigned employees
     *                         in the current batch; may be empty but must not be {@code null}
     */
    private AssetResponse mapToAssetResponse(Asset asset, Map<UUID, String> employeeNameCache) {
        String assignedToName = asset.getAssignedTo() != null
                ? employeeNameCache.get(asset.getAssignedTo())
                : null;
        return buildAssetResponse(asset, assignedToName);
    }

    /**
     * Builds a pre-fetched employee name cache for a batch of assets.
     *
     * <p>Collects all distinct non-null {@code assignedTo} UUIDs from the given asset list,
     * loads the corresponding {@link Employee} records in a single
     * {@code findAllById} call, and returns a {@code UUID → fullName} map.
     * Returns an empty map when no assets are assigned.
     */
    private Map<UUID, String> buildEmployeeNameCache(List<Asset> assets) {
        List<UUID> employeeIds = assets.stream()
                .map(Asset::getAssignedTo)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        if (employeeIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return employeeRepository.findAllById(employeeIds).stream()
                .collect(Collectors.toMap(
                        Employee::getId,
                        Employee::getFullName,
                        (a, b) -> a  // merge function: keep first on duplicate (should not occur)
                ));
    }

    /** Shared builder logic for both mapping overloads. */
    private AssetResponse buildAssetResponse(Asset asset, String assignedToName) {
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
