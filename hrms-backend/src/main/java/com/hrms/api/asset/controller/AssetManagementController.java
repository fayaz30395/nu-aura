package com.hrms.api.asset.controller;

import com.hrms.api.asset.dto.AssetRequest;
import com.hrms.api.asset.dto.AssetResponse;
import com.hrms.application.asset.service.AssetManagementService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.asset.Asset;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetManagementController {

    private final AssetManagementService assetService;

    @PostMapping
    @RequiresPermission("SYSTEM_ADMIN")
    public ResponseEntity<AssetResponse> createAsset(@Valid @RequestBody AssetRequest request) {
        AssetResponse response = assetService.createAsset(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{assetId}")
    @RequiresPermission("SYSTEM_ADMIN")
    public ResponseEntity<AssetResponse> updateAsset(
            @PathVariable UUID assetId,
            @Valid @RequestBody AssetRequest request) {
        AssetResponse response = assetService.updateAsset(assetId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{assetId}/assign")
    @RequiresPermission("SYSTEM_ADMIN")
    public ResponseEntity<AssetResponse> assignAsset(
            @PathVariable UUID assetId,
            @RequestParam UUID employeeId) {
        AssetResponse response = assetService.assignAsset(assetId, employeeId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{assetId}/return")
    @RequiresPermission("SYSTEM_ADMIN")
    public ResponseEntity<AssetResponse> returnAsset(@PathVariable UUID assetId) {
        AssetResponse response = assetService.returnAsset(assetId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{assetId}")
    @RequiresPermission("EMPLOYEE_VIEW_SELF")
    public ResponseEntity<AssetResponse> getAssetById(@PathVariable UUID assetId) {
        AssetResponse response = assetService.getAssetById(assetId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission("EMPLOYEE_VIEW_SELF")
    public ResponseEntity<Page<AssetResponse>> getAllAssets(Pageable pageable) {
        Page<AssetResponse> response = assetService.getAllAssets(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission("EMPLOYEE_VIEW_SELF")
    public ResponseEntity<List<AssetResponse>> getAssetsByEmployee(@PathVariable UUID employeeId) {
        List<AssetResponse> response = assetService.getAssetsByEmployee(employeeId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @RequiresPermission("EMPLOYEE_VIEW_SELF")
    public ResponseEntity<List<AssetResponse>> getAssetsByStatus(@PathVariable Asset.AssetStatus status) {
        List<AssetResponse> response = assetService.getAssetsByStatus(status);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{assetId}")
    @RequiresPermission("SYSTEM_ADMIN")
    public ResponseEntity<Void> deleteAsset(@PathVariable UUID assetId) {
        assetService.deleteAsset(assetId);
        return ResponseEntity.noContent().build();
    }
}
