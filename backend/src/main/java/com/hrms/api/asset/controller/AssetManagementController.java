package com.hrms.api.asset.controller;

import com.hrms.api.asset.dto.AssetRequest;
import com.hrms.api.asset.dto.AssetResponse;
import com.hrms.api.audit.dto.AuditLogResponse;
import com.hrms.application.asset.service.AssetManagementService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.asset.Asset;
import com.hrms.domain.asset.AssetMaintenanceRequest;

import static com.hrms.common.security.Permission.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetManagementController {

    private final AssetManagementService assetService;
    private final com.hrms.common.security.DataScopeService dataScopeService;

    @PostMapping
    @RequiresPermission(ASSET_CREATE)
    public ResponseEntity<AssetResponse> createAsset(@Valid @RequestBody AssetRequest request) {
        AssetResponse response = assetService.createAsset(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{assetId}")
    @RequiresPermission(ASSET_MANAGE)
    public ResponseEntity<AssetResponse> updateAsset(
            @PathVariable UUID assetId,
            @Valid @RequestBody AssetRequest request) {
        AssetResponse response = assetService.updateAsset(assetId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{assetId}/assign")
    @RequiresPermission(ASSET_ASSIGN)
    public ResponseEntity<AssetResponse> assignAsset(
            @PathVariable UUID assetId,
            @RequestParam UUID employeeId) {
        AssetResponse response = assetService.assignAsset(assetId, employeeId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{assetId}/return")
    @RequiresPermission(ASSET_MANAGE)
    public ResponseEntity<AssetResponse> returnAsset(@PathVariable UUID assetId) {
        AssetResponse response = assetService.returnAsset(assetId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{assetId}")
    @RequiresPermission(ASSET_VIEW)
    public ResponseEntity<AssetResponse> getAssetById(@PathVariable UUID assetId) {
        AssetResponse response = assetService.getAssetById(assetId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission(ASSET_VIEW)
    public ResponseEntity<Page<AssetResponse>> getAllAssets(Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Asset> spec = dataScopeService
                .getScopeSpecification(ASSET_VIEW);
        Page<AssetResponse> response = assetService.getAllAssets(spec, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(ASSET_VIEW)
    public ResponseEntity<List<AssetResponse>> getAssetsByEmployee(@PathVariable UUID employeeId) {
        List<AssetResponse> response = assetService.getAssetsByEmployee(employeeId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<AssetResponse>> getAssetsByStatus(@PathVariable Asset.AssetStatus status) {
        List<AssetResponse> response = assetService.getAssetsByStatus(status);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{assetId}")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<Void> deleteAsset(@PathVariable UUID assetId) {
        assetService.deleteAsset(assetId);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Self-service asset request (via approval workflow)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Employee self-request for an asset. Triggers the approval workflow.
     * The requesting employee is resolved from the security context.
     */
    @PostMapping("/request")
    @RequiresPermission(ASSET_VIEW)
    public ResponseEntity<AssetResponse> requestAsset(@RequestBody @Valid AssetSelfRequest request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        AssetResponse response = assetService.requestAssetAssignment(request.assetId(), employeeId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Maintenance requests
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/maintenance")
    @RequiresPermission(ASSET_VIEW)
    public ResponseEntity<AssetMaintenanceRequest> createMaintenanceRequest(
            @RequestBody @Valid MaintenanceRequestBody body) {
        UUID requestedBy = SecurityContext.getCurrentEmployeeId();
        AssetMaintenanceRequest created = assetService.createMaintenanceRequest(
                body.assetId(), requestedBy, body.maintenanceType(),
                body.issueDescription(), body.priority());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{assetId}/maintenance")
    @RequiresPermission(ASSET_VIEW)
    public ResponseEntity<List<AssetMaintenanceRequest>> getMaintenanceHistory(
            @PathVariable UUID assetId) {
        List<AssetMaintenanceRequest> history = assetService.getMaintenanceHistory(assetId);
        return ResponseEntity.ok(history);
    }

    @PatchMapping("/maintenance/{requestId}/status")
    @RequiresPermission(ASSET_MANAGE)
    public ResponseEntity<AssetMaintenanceRequest> updateMaintenanceStatus(
            @PathVariable UUID requestId,
            @RequestBody @Valid MaintenanceStatusUpdate body) {
        AssetMaintenanceRequest updated = assetService.updateMaintenanceStatus(
                requestId, body.status(), body.notes());
        return ResponseEntity.ok(updated);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Audit trail
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/{assetId}/audit")
    @RequiresPermission(ASSET_VIEW)
    public ResponseEntity<List<AuditLogResponse>> getAssetAuditTrail(@PathVariable UUID assetId) {
        List<AuditLogResponse> trail = assetService.getAssetAuditTrail(assetId);
        return ResponseEntity.ok(trail);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Request DTOs (inner records)
    // ─────────────────────────────────────────────────────────────────────────

    record AssetSelfRequest(@NotNull UUID assetId) {}

    record MaintenanceRequestBody(
            @NotNull UUID assetId,
            @NotBlank String maintenanceType,
            @NotBlank String issueDescription,
            @NotBlank String priority) {}

    record MaintenanceStatusUpdate(
            @NotNull AssetMaintenanceRequest.MaintenanceStatus status,
            String notes) {}
}
