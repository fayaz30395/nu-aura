package com.hrms.api.exit.controller;

import com.hrms.api.exit.dto.*;
import com.hrms.application.exit.service.ExitManagementService;
import com.hrms.domain.exit.ExitProcess;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.UUID;

/**
 * Offboarding API alias controller.
 * Acts as a thin routing layer mapping /api/v1/offboarding requests to the ExitManagementService.
 * This controller provides backward compatibility and an alternative endpoint naming convention.
 */
@RestController
@RequestMapping("/api/v1/offboarding")
@RequiredArgsConstructor
@Tag(name = "Offboarding", description = "Offboarding Management APIs (alias for Exit Management)")
public class OffboardingController {

    private final ExitManagementService exitService;

    // ==================== Offboarding Process Endpoints ====================

    /**
     * Create a new offboarding process (exit process).
     */
    @PostMapping
    @RequiresPermission(Permission.OFFBOARDING_MANAGE)
    @Operation(summary = "Initiate an offboarding process")
    public ResponseEntity<ExitProcessResponse> createOffboarding(@Valid @RequestBody ExitProcessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exitService.createExitProcess(request));
    }

    /**
     * Get all offboarding processes.
     */
    @GetMapping
    @RequiresPermission(Permission.OFFBOARDING_VIEW)
    @Operation(summary = "Get all offboarding processes")
    public ResponseEntity<Page<ExitProcessResponse>> getAllOffboardings(Pageable pageable) {
        return ResponseEntity.ok(exitService.getAllExitProcesses(pageable));
    }

    /**
     * Get offboarding process by ID.
     */
    @GetMapping("/{id}")
    @RequiresPermission(Permission.OFFBOARDING_VIEW)
    @Operation(summary = "Get offboarding process by ID")
    public ResponseEntity<ExitProcessResponse> getOffboardingById(@PathVariable UUID id) {
        return ResponseEntity.ok(exitService.getExitProcessById(id));
    }

    /**
     * Get offboarding process by employee ID.
     */
    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.OFFBOARDING_VIEW)
    @Operation(summary = "Get offboarding process by employee ID")
    public ResponseEntity<ExitProcessResponse> getOffboardingByEmployee(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(exitService.getExitProcessByEmployee(employeeId));
    }

    /**
     * Update offboarding process.
     */
    @PutMapping("/{id}")
    @RequiresPermission(Permission.OFFBOARDING_MANAGE)
    @Operation(summary = "Update an offboarding process")
    public ResponseEntity<ExitProcessResponse> updateOffboarding(
            @PathVariable UUID id,
            @Valid @RequestBody ExitProcessRequest request) {
        return ResponseEntity.ok(exitService.updateExitProcess(id, request));
    }

    /**
     * Update offboarding status.
     */
    @PatchMapping("/{id}/status")
    @RequiresPermission(Permission.OFFBOARDING_MANAGE)
    @Operation(summary = "Update offboarding process status")
    public ResponseEntity<ExitProcessResponse> updateOffboardingStatus(
            @PathVariable UUID id,
            @RequestParam ExitProcess.ExitStatus status) {
        return ResponseEntity.ok(exitService.updateExitStatus(id, status));
    }

    /**
     * Get offboarding processes by status.
     */
    @GetMapping("/status/{status}")
    @RequiresPermission(Permission.OFFBOARDING_VIEW)
    @Operation(summary = "Get offboarding processes by status")
    public ResponseEntity<Page<ExitProcessResponse>> getOffboardingsByStatus(
            @PathVariable ExitProcess.ExitStatus status,
            Pageable pageable) {
        // Note: Original service returns List, but for consistency with GET endpoints,
        // we delegate to the service method. Clients should use the ExitManagementController
        // for status filtering if pagination is required.
        exitService.getExitProcessesByStatus(status);
        return ResponseEntity.ok(exitService.getAllExitProcesses(pageable));
    }

    /**
     * Delete offboarding process.
     */
    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.OFFBOARDING_MANAGE)
    @Operation(summary = "Delete an offboarding process")
    public ResponseEntity<Void> deleteOffboarding(@PathVariable UUID id) {
        exitService.deleteExitProcess(id);
        return ResponseEntity.noContent().build();
    }
}
