package com.hrms.api.project;

import com.hrms.api.project.dto.*;
import com.hrms.application.project.service.ResourceAllocationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {

    private final ResourceAllocationService allocationService;

    public ResourceController(ResourceAllocationService allocationService) {
        this.allocationService = allocationService;
    }

    /**
     * Get allocation summary for all employees (with over-allocation flags).
     */
    @GetMapping("/allocation-summary")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<List<AllocationSummaryResponse>> getAllocationSummary() {
        return ResponseEntity.ok(allocationService.getAllocationSummary());
    }

    /**
     * Get full allocation timeline for a single employee.
     */
    @GetMapping("/employees/{employeeId}/timeline")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<EmployeeTimelineResponse> getEmployeeTimeline(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(allocationService.getEmployeeTimeline(employeeId));
    }

    /**
     * Update allocation % / role / dates for a project assignment.
     */
    @PutMapping("/allocations/{allocationId}")
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<ProjectEmployeeResponse> reallocate(
            @PathVariable UUID allocationId,
            @Valid @RequestBody ReallocateRequest request) {
        return ResponseEntity.ok(allocationService.reallocate(allocationId, request));
    }

    /**
     * Get available employees (with capacity remaining).
     */
    @GetMapping("/available")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<List<AvailableResourceResponse>> getAvailableResources(
            @RequestParam(defaultValue = "20") int minAvailablePercent) {
        return ResponseEntity.ok(allocationService.getAvailableResources(minAvailablePercent));
    }
}
