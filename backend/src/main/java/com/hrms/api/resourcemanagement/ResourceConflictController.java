package com.hrms.api.resourcemanagement;

import com.hrms.application.resourcemanagement.service.ResourceConflictService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/resource-management/conflicts")
@RequiredArgsConstructor
@Slf4j
public class ResourceConflictController {

    private final ResourceConflictService resourceConflictService;

    /**
     * Pre-flight check before adding an employee to a project.
     * Returns empty list if no conflict; otherwise returns conflict descriptions.
     */
    @PostMapping("/check")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    public ResponseEntity<List<ResourceConflictService.ConflictResult>> checkConflict(
            @Valid @RequestBody ConflictCheckRequest dto) {
        log.info("Conflict check: employee={} project={}", dto.getEmployeeId(), dto.getProjectId());
        return ResponseEntity.ok(resourceConflictService.checkAllocationConflict(
                dto.getEmployeeId(),
                dto.getProjectId(),
                dto.getStartDate(),
                dto.getEndDate(),
                dto.getAllocationPercentage()));
    }

    /**
     * Full scan of all active allocations for the current tenant.
     * Returns all employees/projects that are over-allocated.
     */
    @PostMapping("/scan")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    public ResponseEntity<List<ResourceConflictService.ConflictResult>> scanConflicts() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Full resource conflict scan for tenant {}", tenantId);
        return ResponseEntity.ok(resourceConflictService.scanTenantConflicts(tenantId));
    }

    /**
     * Get all open (unresolved) conflicts for the tenant.
     */
    @GetMapping("/open")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    public ResponseEntity<List<Map<String, Object>>> getOpenConflicts() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return ResponseEntity.ok(resourceConflictService.getOpenConflicts(tenantId));
    }

    /**
     * Mark a conflict as resolved.
     */
    @PostMapping("/{conflictId}/resolve")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    public ResponseEntity<Void> resolveConflict(
            @PathVariable UUID conflictId,
            @Valid @RequestBody ResolveDto dto) {
        resourceConflictService.resolveConflict(conflictId, dto.getResolvedBy());
        return ResponseEntity.noContent().build();
    }

    // ========== DTOs ==========

    @Data
    public static class ConflictCheckRequest {
        @NotNull
        private UUID employeeId;
        @NotNull
        private UUID projectId;
        @NotNull
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate startDate;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate endDate;
        @NotNull
        @Min(1)
        @Max(100)
        private Integer allocationPercentage;
    }

    @Data
    public static class ResolveDto {
        @NotNull
        private UUID resolvedBy;
    }
}
