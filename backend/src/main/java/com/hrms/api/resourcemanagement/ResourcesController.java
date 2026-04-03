package com.hrms.api.resourcemanagement;

import com.hrms.application.resourcemanagement.service.ResourceManagementService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import static com.hrms.api.resourcemanagement.dto.ApprovalDTOs.*;

/**
 * Secondary resource endpoints called by the frontend {@code resource-management.service.ts}.
 *
 * <p>Path prefix: /api/v1/resources
 *
 * <p>These endpoints complement {@link ResourceManagementController} (at /api/v1/resource-management)
 * and resolve the 404 errors reported by QA for the /resources/* paths.
 */
@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
@Tag(name = "Resources", description = "Supplementary resource allocation endpoints for frontend consumption")
public class ResourcesController {

    private final ResourceManagementService resourceManagementService;
    private final EmployeeRepository employeeRepository;
    private final ProjectEmployeeRepository projectEmployeeRepository;
    private final HrmsProjectRepository projectRepository;

    // -----------------------------------------------------------------------
    // DTOs
    // -----------------------------------------------------------------------

    @Data
    @NoArgsConstructor
    public static class AllocationSummaryEntry {
        private UUID employeeId;
        private String employeeName;
        private String designation;
        private int totalAllocationPercent;
        private boolean isOverAllocated;
        private List<ProjectAllocationItem> projects = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class ProjectAllocationItem {
        private UUID projectId;
        private String projectName;
        private String role;
        private int allocationPercent;
        private String startDate;
        private String endDate;
    }

    @Data
    @NoArgsConstructor
    public static class AvailableResource {
        private UUID employeeId;
        private String employeeName;
        private String designation;
        private int currentAllocationPercent;
        private int availablePercent;
    }

    @Data
    @NoArgsConstructor
    public static class EmployeeTimeline {
        private UUID employeeId;
        private String employeeName;
        private List<TimelineEntry> timeline = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class TimelineEntry {
        private UUID projectId;
        private String projectName;
        private String startDate;
        private String endDate;
        private int allocationPercent;
        private boolean isActive;
    }

    @Data
    @NoArgsConstructor
    public static class AllocationDetail {
        private UUID id;
        private UUID employeeId;
        private String employeeName;
        private UUID projectId;
        private String projectName;
        private String role;
        private int allocationPercent;
        private String startDate;
        private String endDate;
        private boolean isActive;
        private String status;
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/resources/allocation-summary
    // -----------------------------------------------------------------------

    /**
     * Returns allocation summary for all active employees in the tenant.
     * Called by {@code resourceManagementService.getAllocationSummary()} in the frontend.
     */
    @GetMapping("/allocation-summary")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get allocation summary for all employees")
    public ResponseEntity<List<AllocationSummaryEntry>> getAllocationSummary() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<Employee> employees = employeeRepository.findByTenantId(tenantId);

        List<AllocationSummaryEntry> summary = employees.stream().map(emp -> {
            AllocationSummaryEntry entry = new AllocationSummaryEntry();
            entry.setEmployeeId(emp.getId());
            entry.setEmployeeName(emp.getFullName());
            entry.setDesignation(emp.getDesignation());

            List<ProjectEmployee> activeAssignments = projectEmployeeRepository
                    .findAllByEmployeeIdAndTenantIdAndIsActive(emp.getId(), tenantId, true);

            int totalAlloc = activeAssignments.stream()
                    .mapToInt(pe -> pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0)
                    .sum();
            entry.setTotalAllocationPercent(totalAlloc);
            entry.setOverAllocated(totalAlloc > 100);

            List<ProjectAllocationItem> projects = activeAssignments.stream().map(pe -> {
                ProjectAllocationItem item = new ProjectAllocationItem();
                item.setProjectId(pe.getProjectId());
                item.setRole(pe.getRole());
                item.setAllocationPercent(pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0);
                item.setStartDate(pe.getStartDate() != null ? pe.getStartDate().toString() : null);
                item.setEndDate(pe.getEndDate() != null ? pe.getEndDate().toString() : null);
                projectRepository.findById(pe.getProjectId())
                        .ifPresent(p -> item.setProjectName(p.getName()));
                return item;
            }).collect(Collectors.toList());
            entry.setProjects(projects);

            return entry;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(summary);
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/resources/available
    // -----------------------------------------------------------------------

    /**
     * Returns employees with available capacity above the given threshold.
     * Called by {@code resourceManagementService.getAvailableResources()} in the frontend.
     */
    @GetMapping("/available")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get employees with available capacity")
    public ResponseEntity<List<AvailableResource>> getAvailableResources(
            @RequestParam(defaultValue = "20") int minAvailablePercent) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<Employee> employees = employeeRepository.findByTenantId(tenantId);

        List<AvailableResource> result = employees.stream().map(emp -> {
            List<ProjectEmployee> active = projectEmployeeRepository
                    .findAllByEmployeeIdAndTenantIdAndIsActive(emp.getId(), tenantId, true);
            int currentAlloc = active.stream()
                    .mapToInt(pe -> pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0)
                    .sum();
            int available = 100 - currentAlloc;

            AvailableResource ar = new AvailableResource();
            ar.setEmployeeId(emp.getId());
            ar.setEmployeeName(emp.getFullName());
            ar.setDesignation(emp.getDesignation());
            ar.setCurrentAllocationPercent(currentAlloc);
            ar.setAvailablePercent(available);
            return ar;
        }).filter(ar -> ar.getAvailablePercent() >= minAvailablePercent)
          .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/resources/employees/{employeeId}/timeline
    // -----------------------------------------------------------------------

    /**
     * Returns the allocation timeline for a specific employee.
     * Called by {@code resourceManagementService.getEmployeeAllocationTimeline()} in the frontend.
     */
    @GetMapping("/employees/{employeeId}/timeline")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    @Operation(summary = "Get allocation timeline for an employee")
    public ResponseEntity<EmployeeTimeline> getEmployeeTimeline(@PathVariable UUID employeeId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Employee emp = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        List<ProjectEmployee> allAssignments = projectEmployeeRepository
                .findAllByEmployeeIdAndTenantId(employeeId, tenantId);

        List<TimelineEntry> timeline = allAssignments.stream().map(pe -> {
            TimelineEntry entry = new TimelineEntry();
            entry.setProjectId(pe.getProjectId());
            entry.setAllocationPercent(pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0);
            entry.setStartDate(pe.getStartDate() != null ? pe.getStartDate().toString() : null);
            entry.setEndDate(pe.getEndDate() != null ? pe.getEndDate().toString() : null);
            entry.setActive(Boolean.TRUE.equals(pe.getIsActive()));
            projectRepository.findById(pe.getProjectId())
                    .ifPresent(p -> entry.setProjectName(p.getName()));
            return entry;
        }).collect(Collectors.toList());

        EmployeeTimeline result = new EmployeeTimeline();
        result.setEmployeeId(employeeId);
        result.setEmployeeName(emp.getFullName());
        result.setTimeline(timeline);
        return ResponseEntity.ok(result);
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/resources/allocations/{allocationId}
    // -----------------------------------------------------------------------

    /**
     * Returns details of a specific allocation by its project_employees record ID.
     * Called by {@code resourceManagementService.reallocate()} PUT and referenced in
     * UC-RESOURCE-007 verification: GET /api/v1/resources/allocations/{id}.
     */
    @GetMapping("/allocations/{allocationId}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get a specific allocation by ID")
    public ResponseEntity<AllocationDetail> getAllocation(@PathVariable UUID allocationId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ProjectEmployee pe = projectEmployeeRepository.findById(allocationId)
                .filter(a -> tenantId.equals(a.getTenantId()))
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        AllocationDetail detail = new AllocationDetail();
        detail.setId(pe.getId());
        detail.setEmployeeId(pe.getEmployeeId());
        detail.setProjectId(pe.getProjectId());
        detail.setRole(pe.getRole());
        detail.setAllocationPercent(pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0);
        detail.setStartDate(pe.getStartDate() != null ? pe.getStartDate().toString() : null);
        detail.setEndDate(pe.getEndDate() != null ? pe.getEndDate().toString() : null);
        detail.setActive(Boolean.TRUE.equals(pe.getIsActive()));
        detail.setStatus(Boolean.TRUE.equals(pe.getIsActive()) ? "APPROVED" : "INACTIVE");

        employeeRepository.findByIdAndTenantId(pe.getEmployeeId(), tenantId)
                .ifPresent(emp -> detail.setEmployeeName(emp.getFullName()));
        projectRepository.findById(pe.getProjectId())
                .ifPresent(p -> detail.setProjectName(p.getName()));

        return ResponseEntity.ok(detail);
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/resources/allocations/{allocationId}
    // -----------------------------------------------------------------------

    @Data
    @NoArgsConstructor
    public static class ReallocateRequest {
        private Integer allocationPercentage;
        private String role;
        private LocalDate startDate;
        private LocalDate endDate;
    }

    /**
     * Update an allocation record (reallocate).
     * Called by {@code resourceManagementService.reallocate()} in the frontend.
     */
    @PutMapping("/allocations/{allocationId}")
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Update (reallocate) an existing allocation")
    public ResponseEntity<AllocationDetail> reallocate(
            @PathVariable UUID allocationId,
            @RequestBody ReallocateRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        ProjectEmployee pe = projectEmployeeRepository.findById(allocationId)
                .filter(a -> tenantId.equals(a.getTenantId()))
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found: " + allocationId));

        if (request.getAllocationPercentage() != null) {
            pe.setAllocationPercentage(request.getAllocationPercentage());
        }
        if (request.getRole() != null) {
            pe.setRole(request.getRole());
        }
        if (request.getStartDate() != null) {
            pe.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            pe.setEndDate(request.getEndDate());
        }
        projectEmployeeRepository.save(pe);

        AllocationDetail detail = new AllocationDetail();
        detail.setId(pe.getId());
        detail.setEmployeeId(pe.getEmployeeId());
        detail.setProjectId(pe.getProjectId());
        detail.setRole(pe.getRole());
        detail.setAllocationPercent(pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0);
        detail.setStartDate(pe.getStartDate() != null ? pe.getStartDate().toString() : null);
        detail.setEndDate(pe.getEndDate() != null ? pe.getEndDate().toString() : null);
        detail.setActive(Boolean.TRUE.equals(pe.getIsActive()));
        detail.setStatus("APPROVED");

        employeeRepository.findByIdAndTenantId(pe.getEmployeeId(), tenantId)
                .ifPresent(emp -> detail.setEmployeeName(emp.getFullName()));
        projectRepository.findById(pe.getProjectId())
                .ifPresent(p -> detail.setProjectName(p.getName()));

        return ResponseEntity.ok(detail);
    }
}
