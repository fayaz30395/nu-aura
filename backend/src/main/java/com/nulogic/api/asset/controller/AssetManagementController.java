package com.nulogic.api.asset.controller;

import com.nulogic.api.asset.dto.AssetRequest;
import com.nulogic.api.asset.dto.AssetResponse;
import com.nulogic.api.audit.dto.AuditLogResponse;
import com.nulogic.application.asset.service.AssetManagementService;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.asset.Asset;
import com.nulogic.domain.asset.AssetMaintenanceRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import java.util.UUID;

import static com.nulogic.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
@Tag(name = "Asset Management", description = "Hardware/software asset lifecycle, assignment, maintenance, and audit trail")
public class AssetManagementController {

    private final AssetManagementService assetService;
    private final com.nulogic.common.security.DataScopeService dataScopeService;

    @PostMapping
    @RequiresPermission(ASSET_CREATE)
    @Operation(summary = "Create asset", description = "Register a new asset in the inventory (admin/IT only)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Asset created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires ASSET:CREATE permission")
    })
    public ResponseEntity<AssetResponse> createAsset(@Valid @RequestBody AssetRequest request) {
        AssetResponse response = assetService.createAsset(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{assetId}")
    @RequiresPermission(ASSET_MANAGE)
    @Operation(summary = "Update asset", description = "Mutate an existing asset's metadata, specs, or status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Asset updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Asset not found")
    })
    public ResponseEntity<AssetResponse> updateAsset(
            @Parameter(description = "Asset UUID") @PathVariable UUID assetId,
            @Valid @RequestBody AssetRequest request) {
        AssetResponse response = assetService.updateAsset(assetId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{assetId}/assign")
    @RequiresPermission(ASSET_ASSIGN)
    @Operation(summary = "Assign asset to employee",
            description = "Assign an asset to the given employee and update its status to ASSIGNED")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Asset assigned successfully"),
            @ApiResponse(responseCode = "404", description = "Asset or employee not found"),
            @ApiResponse(responseCode = "409", description = "Asset is not available for assignment")
    })
    public ResponseEntity<AssetResponse> assignAsset(
            @Parameter(description = "Asset UUID") @PathVariable UUID assetId,
            @Parameter(description = "Target employee UUID") @RequestParam UUID employeeId) {
        AssetResponse response = assetService.assignAsset(assetId, employeeId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{assetId}/return")
    @RequiresPermission(ASSET_MANAGE)
    @Operation(summary = "Return asset", description = "Mark an assigned asset as returned, transitioning to AVAILABLE")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Asset returned successfully"),
            @ApiResponse(responseCode = "404", description = "Asset not found"),
            @ApiResponse(responseCode = "409", description = "Asset is not currently assigned")
    })
    public ResponseEntity<AssetResponse> returnAsset(
            @Parameter(description = "Asset UUID") @PathVariable UUID assetId) {
        AssetResponse response = assetService.returnAsset(assetId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{assetId}")
    @RequiresPermission(ASSET_VIEW)
    @Operation(summary = "Get asset by ID", description = "Returns a single asset by its UUID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Asset found"),
            @ApiResponse(responseCode = "404", description = "Asset not found")
    })
    public ResponseEntity<AssetResponse> getAssetById(
            @Parameter(description = "Asset UUID") @PathVariable UUID assetId) {
        AssetResponse response = assetService.getAssetById(assetId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission(ASSET_VIEW)
    @Operation(summary = "List all assets",
            description = "Returns a paginated, scope-filtered list of assets in the tenant")
    @ApiResponse(responseCode = "200", description = "Assets retrieved successfully")
    public ResponseEntity<Page<AssetResponse>> getAllAssets(Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Asset> spec = dataScopeService
                .getScopeSpecification(ASSET_VIEW);
        Page<AssetResponse> response = assetService.getAllAssets(spec, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({ASSET_VIEW, EMPLOYEE_VIEW_SELF})
    @Operation(summary = "List assets assigned to employee",
            description = "Returns assets currently assigned to the specified employee")
    @ApiResponse(responseCode = "200", description = "Assets retrieved successfully")
    public ResponseEntity<List<AssetResponse>> getAssetsByEmployee(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        List<AssetResponse> response = assetService.getAssetsByEmployee(employeeId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    @Operation(summary = "List assets by status",
            description = "Filter assets by status (AVAILABLE, ASSIGNED, MAINTENANCE, RETIRED, etc.)")
    @ApiResponse(responseCode = "200", description = "Assets retrieved successfully")
    public ResponseEntity<List<AssetResponse>> getAssetsByStatus(
            @Parameter(description = "Asset status", example = "AVAILABLE") @PathVariable Asset.AssetStatus status) {
        List<AssetResponse> response = assetService.getAssetsByStatus(status);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{assetId}")
    @RequiresPermission(SYSTEM_ADMIN)
    @Operation(summary = "Delete asset", description = "Soft-delete an asset record (system admin only)")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Asset deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Asset not found")
    })
    public ResponseEntity<Void> deleteAsset(
            @Parameter(description = "Asset UUID") @PathVariable UUID assetId) {
        assetService.deleteAsset(assetId);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Self-service asset request (via approval workflow)
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/request")
    @RequiresPermission(ASSET_VIEW)
    @Operation(summary = "Request asset (self-service)",
            description = "Employee submits a self-request for an asset; triggers the approval workflow")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Request submitted successfully"),
            @ApiResponse(responseCode = "404", description = "Asset not found")
    })
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
    @Operation(summary = "Create maintenance request",
            description = "Open a maintenance ticket for an asset (typically by the current holder)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Maintenance request created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Asset not found")
    })
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
    @Operation(summary = "Get maintenance history",
            description = "Returns the full maintenance request history for the specified asset")
    @ApiResponse(responseCode = "200", description = "Maintenance history retrieved successfully")
    public ResponseEntity<List<AssetMaintenanceRequest>> getMaintenanceHistory(
            @Parameter(description = "Asset UUID") @PathVariable UUID assetId) {
        List<AssetMaintenanceRequest> history = assetService.getMaintenanceHistory(assetId);
        return ResponseEntity.ok(history);
    }

    @PatchMapping("/maintenance/{requestId}/status")
    @RequiresPermission(ASSET_MANAGE)
    @Operation(summary = "Update maintenance request status",
            description = "Transition a maintenance request to a new status (IN_PROGRESS, COMPLETED, etc.)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated successfully"),
            @ApiResponse(responseCode = "404", description = "Maintenance request not found")
    })
    public ResponseEntity<AssetMaintenanceRequest> updateMaintenanceStatus(
            @Parameter(description = "Maintenance request UUID") @PathVariable UUID requestId,
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
    @Operation(summary = "Get asset audit trail",
            description = "Returns the full audit log for an asset (assignments, returns, edits)")
    @ApiResponse(responseCode = "200", description = "Audit trail retrieved successfully")
    public ResponseEntity<List<AuditLogResponse>> getAssetAuditTrail(
            @Parameter(description = "Asset UUID") @PathVariable UUID assetId) {
        List<AuditLogResponse> trail = assetService.getAssetAuditTrail(assetId);
        return ResponseEntity.ok(trail);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Request DTOs (inner records)
    // ─────────────────────────────────────────────────────────────────────────

    record AssetSelfRequest(@NotNull UUID assetId) {
    }

    record MaintenanceRequestBody(
            @NotNull UUID assetId,
            @NotBlank String maintenanceType,
            @NotBlank String issueDescription,
            @NotBlank String priority) {
    }

    record MaintenanceStatusUpdate(
            @NotNull AssetMaintenanceRequest.MaintenanceStatus status,
            String notes) {
    }
}
