package com.hrms.api.resourcemanagement;

import com.hrms.api.resourcemanagement.dto.*;
import com.hrms.application.resourcemanagement.service.ResourceManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import static com.hrms.api.resourcemanagement.dto.ApprovalDTOs.*;
import static com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;
import static com.hrms.api.resourcemanagement.dto.AvailabilityDTOs.*;

@RestController
@RequestMapping("/api/v1/resource-management")
@RequiredArgsConstructor
@Tag(name = "Resource Management", description = "Endpoints for resource capacity and project allocations")
public class ResourceManagementController {

    private final ResourceManagementService resourceManagementService;

    @GetMapping("/capacity/employee/{employeeId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get employee capacity and current allocations")
    public ResponseEntity<EmployeeCapacity> getEmployeeCapacity(
            @PathVariable UUID employeeId,
            @RequestParam(required = false) LocalDate asOfDate) {
        return ResponseEntity.ok(resourceManagementService.getEmployeeCapacity(employeeId,
                asOfDate != null ? asOfDate : LocalDate.now()));
    }

    @GetMapping("/capacity/employees")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get multiple employees capacity")
    public ResponseEntity<List<EmployeeCapacity>> getEmployeesCapacity(
            @RequestParam(required = false) List<UUID> employeeIds,
            @RequestParam(required = false) LocalDate asOfDate) {
        return ResponseEntity.ok(resourceManagementService.getEmployeesCapacity(employeeIds,
                asOfDate != null ? asOfDate : LocalDate.now()));
    }

    @PostMapping("/capacity/employees")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get capacity for multiple employees via POST request")
    public ResponseEntity<List<EmployeeCapacity>> getEmployeesCapacityPost(
            @Valid @RequestBody GetEmployeesCapacityRequest request) {
        return ResponseEntity.ok(resourceManagementService.getEmployeesCapacity(request.getEmployeeIds(),
                request.getAsOfDate() != null ? request.getAsOfDate() : LocalDate.now()));
    }

    @GetMapping("/allocation/validate")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Validate a proposed allocation")
    public ResponseEntity<AllocationValidationResult> validateAllocation(
            @RequestParam UUID employeeId,
            @RequestParam UUID projectId,
            @RequestParam Integer allocationPercentage,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        return ResponseEntity.ok(resourceManagementService.validateAllocation(employeeId, projectId,
                allocationPercentage, startDate != null ? startDate : LocalDate.now(), endDate));
    }

    @PostMapping("/allocation/validate")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Validate a proposed allocation via POST request")
    public ResponseEntity<AllocationValidationResult> validateAllocationPost(
            @Valid @RequestBody ValidateAllocationRequest request) {
        return ResponseEntity.ok(resourceManagementService.validateAllocation(request.getEmployeeId(),
                request.getProjectId(), request.getAllocationPercentage(), LocalDate.now(), null));
    }

    @PutMapping("/allocation")
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Update an existing allocation")
    public ResponseEntity<EmployeeWorkload> updateAllocation(@Valid @RequestBody UpdateAllocationRequest request) {
        return ResponseEntity.ok(resourceManagementService.updateAllocation(request));
    }

    @GetMapping("/capacity/over-allocated")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get all over-allocated employees")
    public ResponseEntity<List<EmployeeCapacity>> getOverAllocatedEmployees(
            @RequestParam(required = false) UUID departmentId,
            Pageable pageable) {
        return ResponseEntity.ok(resourceManagementService.getOverAllocatedEmployees(departmentId, pageable));
    }

    @GetMapping("/capacity/available")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get all available employees")
    public ResponseEntity<List<EmployeeCapacity>> getAvailableEmployees(
            @RequestParam(defaultValue = "20") Integer minCapacity,
            @RequestParam(required = false) UUID departmentId,
            Pageable pageable) {
        return ResponseEntity.ok(resourceManagementService.getAvailableEmployees(minCapacity, departmentId, pageable));
    }

    @PostMapping("/allocation-requests")
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Create an allocation approval request")
    public ResponseEntity<AllocationApprovalResponse> createAllocationRequest(
            @Valid @RequestBody CreateAllocationRequest request) {
        return ResponseEntity.ok(resourceManagementService.createAllocationRequest(request));
    }

    @GetMapping("/allocation-requests/my-pending")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get pending allocation requests for current manager")
    public ResponseEntity<Page<AllocationApprovalResponse>> getMyPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(resourceManagementService.getMyPendingApprovals(pageable));
    }

    @GetMapping("/allocation-requests/pending")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get all pending allocation requests")
    public ResponseEntity<Page<AllocationApprovalResponse>> getAllPendingRequests(
            @RequestParam(required = false) UUID departmentId,
            Pageable pageable) {
        return ResponseEntity.ok(resourceManagementService.getAllPendingRequests(departmentId, pageable));
    }

    @GetMapping("/allocation-requests/{requestId}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get details of a specific allocation request")
    public ResponseEntity<AllocationApprovalResponse> getAllocationRequest(@PathVariable UUID requestId) {
        return ResponseEntity.ok(resourceManagementService.getAllocationRequest(requestId));
    }

    @GetMapping("/allocation-requests/employee/{employeeId}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get allocation request history for an employee")
    public ResponseEntity<Page<AllocationApprovalResponse>> getEmployeeAllocationHistory(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(resourceManagementService.getEmployeeAllocationHistory(employeeId, pageable));
    }

    @GetMapping("/allocation-requests/pending/count")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get count of pending requests for badges")
    public ResponseEntity<Map<String, Long>> getPendingRequestsCount() {
        return ResponseEntity.ok(Map.of("count", resourceManagementService.getPendingApprovalsCount()));
    }

    @PostMapping("/allocation-requests/{requestId}/approve")
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Approve an allocation request")
    public ResponseEntity<Void> approveAllocationRequest(
            @PathVariable UUID requestId,
            @Valid @RequestBody(required = false) ApproveRequest request) {
        resourceManagementService.approveAllocationRequest(requestId, request != null ? request.getComment() : null);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/allocation-requests/{requestId}/reject")
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Reject an allocation request")
    public ResponseEntity<Void> rejectAllocationRequest(
            @PathVariable UUID requestId,
            @Valid @RequestBody RejectRequest request) {
        resourceManagementService.rejectAllocationRequest(requestId, request.getReason());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/workload/dashboard")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Get workload dashboard data with filters")
    public ResponseEntity<WorkloadDashboardData> getWorkloadDashboard(
            @Valid @RequestBody(required = false) WorkloadFilterOptions filters) {
        return ResponseEntity.ok(resourceManagementService.getWorkloadDashboard(filters));
    }

    @GetMapping("/availability/employee/{employeeId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get employee availability calendar")
    public ResponseEntity<EmployeeAvailability> getEmployeeAvailability(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return ResponseEntity.ok(resourceManagementService.getEmployeeAvailability(employeeId, startDate, endDate));
    }

    @GetMapping("/availability/team")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get team availability view via GET")
    public ResponseEntity<TeamAvailabilityView> getTeamAvailability(
            @RequestParam(required = false) List<UUID> departmentIds,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return ResponseEntity.ok(resourceManagementService.getTeamAvailability(departmentIds, startDate, endDate));
    }

    @PostMapping("/availability/team")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get team availability view via POST")
    public ResponseEntity<TeamAvailabilityView> getTeamAvailabilityPost(
            @Valid @RequestBody ResourceCalendarFilter filter) {
        return ResponseEntity.ok(resourceManagementService.getTeamAvailability(filter));
    }

    @GetMapping("/availability/aggregated")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get aggregated team availability view")
    public ResponseEntity<TeamAvailabilityView> getAggregatedAvailability(
            @RequestParam(required = false) UUID departmentId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        return ResponseEntity.ok(resourceManagementService.getAggregatedAvailability(startDate, endDate, departmentId));
    }

    @GetMapping("/holidays")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get holidays for resource calendar")
    public ResponseEntity<List<com.hrms.api.resourcemanagement.dto.AvailabilityDTOs.Holiday>> getHolidays(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(required = false) String locationId) {
        return ResponseEntity.ok(resourceManagementService.getHolidays(startDate, endDate));
    }

    @PostMapping("/workload/employees")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Get employee workloads with filters and pagination")
    public ResponseEntity<Page<EmployeeWorkload>> getEmployeeWorkloads(
            @Valid @RequestBody(required = false) WorkloadFilterOptions filters,
            Pageable pageable) {
        return ResponseEntity.ok(resourceManagementService.getEmployeeWorkloads(filters, pageable));
    }

    @GetMapping("/workload/employee/{employeeId}")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Get single employee workload")
    public ResponseEntity<EmployeeWorkload> getEmployeeWorkload(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(resourceManagementService.getEmployeeWorkload(employeeId));
    }

    @GetMapping("/workload/departments")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Get department workloads summary")
    public ResponseEntity<List<DepartmentWorkload>> getDepartmentWorkloads(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        return ResponseEntity.ok(resourceManagementService.getDepartmentWorkloads(startDate, endDate));
    }

    @GetMapping("/workload/heatmap")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Get workload heatmap data")
    public ResponseEntity<List<WorkloadHeatmapRow>> getWorkloadHeatmap(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(resourceManagementService.getWorkloadHeatmap(startDate, endDate, departmentId, limit));
    }

    @PostMapping("/workload/export")
    @RequiresPermission(Permission.ANALYTICS_VIEW)
    @Operation(summary = "Export workload report")
    public ResponseEntity<byte[]> exportWorkloadReport(
            @Valid @RequestBody ExportWorkloadRequest request) {
        return ResponseEntity.ok(resourceManagementService.exportWorkloadReport(
                request.getFormat() != null ? request.getFormat() : "csv", request));
    }
}
