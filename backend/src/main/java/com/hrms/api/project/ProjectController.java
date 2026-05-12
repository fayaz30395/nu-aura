package com.hrms.api.project;

import com.hrms.api.project.dto.*;
import com.hrms.application.project.service.ProjectService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
@Tag(name = "Projects", description = "Project management and team allocation APIs")
public class ProjectController {

    /**
     * Allow-list of sortable fields for {@code Project} entity — prevents reflection-based sort injection.
     */
    private static final java.util.Set<String> ALLOWED_SORT_FIELDS = java.util.Set.of(
            "createdAt", "updatedAt", "name", "projectCode", "status", "priority", "startDate", "endDate", "expectedEndDate"
    );

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    @RequiresPermission(Permission.PROJECT_CREATE)
    @Operation(summary = "Create project", description = "Creates a new project record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Project created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:CREATE permission")
    })
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody CreateProjectRequest request) {
        ProjectResponse response = projectService.createProject(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "List projects", description = "Returns a paginated list of projects with optional status and priority filters")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Projects retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:VIEW permission")
    })
    public ResponseEntity<Page<ProjectResponse>> getAllProjects(
            @Parameter(description = "Filter by project status") @RequestParam(required = false) com.hrms.domain.project.Project.ProjectStatus status,
            @Parameter(description = "Filter by project priority") @RequestParam(required = false) com.hrms.domain.project.Project.Priority priority,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (ASC/DESC)") @RequestParam(defaultValue = "DESC") String sortDirection) {
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, safeSortBy));
        Page<ProjectResponse> projects = projectService.getAllProjects(status, priority, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/search")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Search projects", description = "Search projects by name, code, or description")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Search results retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:VIEW permission")
    })
    public ResponseEntity<Page<ProjectResponse>> searchProjects(
            @Parameter(description = "Search query string") @RequestParam String query,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProjectResponse> projects = projectService.searchProjects(query, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get project by ID", description = "Returns a single project by its UUID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Project found"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<ProjectResponse> getProject(
            @Parameter(description = "Project UUID") @PathVariable UUID id) {
        ProjectResponse response = projectService.getProject(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_UPDATE)
    @Operation(summary = "Update project", description = "Updates an existing project's details")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Project updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<ProjectResponse> updateProject(
            @Parameter(description = "Project UUID") @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectRequest request) {
        ProjectResponse response = projectService.updateProject(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_DELETE)
    @Operation(summary = "Delete project", description = "Soft-deletes a project record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Project deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:DELETE permission"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<Void> deleteProject(
            @Parameter(description = "Project UUID") @PathVariable UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/assign")
    @RequiresPermission(Permission.PROJECT_UPDATE)
    @Operation(summary = "Assign employee to project", description = "Adds an employee allocation to the specified project")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Employee assigned successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid assignment request"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<ProjectEmployeeResponse> assignEmployee(
            @Parameter(description = "Project UUID") @PathVariable UUID id,
            @Valid @RequestBody AssignEmployeeRequest request) {
        ProjectEmployeeResponse response = projectService.assignEmployee(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{projectId}/employees/{employeeId}")
    @RequiresPermission(Permission.PROJECT_UPDATE)
    @Operation(summary = "Remove employee from project", description = "Removes the employee's allocation from the specified project")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Employee removed successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Project or assignment not found")
    })
    public ResponseEntity<Void> removeEmployeeFromProject(
            @Parameter(description = "Project UUID") @PathVariable UUID projectId,
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        projectService.removeEmployeeFromProject(projectId, employeeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/team")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get project team", description = "Returns all active team members allocated to the project")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Team members retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<List<ProjectEmployeeResponse>> getProjectTeamMembers(
            @Parameter(description = "Project UUID") @PathVariable UUID id) {
        List<ProjectEmployeeResponse> teamMembers = projectService.getProjectTeamMembers(id);
        return ResponseEntity.ok(teamMembers);
    }

    @GetMapping("/{id}/allocations")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "List project allocations", description = "Returns a paginated history of all allocations on the project (active and ended)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Allocations retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<Page<ProjectEmployeeResponse>> getProjectAllocations(
            @Parameter(description = "Project UUID") @PathVariable UUID id,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProjectEmployeeResponse> allocations = projectService.getProjectAllocations(id, pageable);
        return ResponseEntity.ok(allocations);
    }

    @PostMapping("/{id}/allocations/{memberId}/end")
    @RequiresPermission(Permission.PROJECT_UPDATE)
    @Operation(summary = "End allocation", description = "Ends a specific team member's active allocation on the project")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Allocation ended successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:UPDATE permission"),
            @ApiResponse(responseCode = "404", description = "Project or allocation not found")
    })
    public ResponseEntity<ProjectEmployeeResponse> endAllocation(
            @Parameter(description = "Project UUID") @PathVariable UUID id,
            @Parameter(description = "Allocation/Member UUID") @PathVariable UUID memberId) {
        ProjectEmployeeResponse response = projectService.endAllocation(id, memberId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get employee's projects", description = "Returns all projects on which the employee has been allocated")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Projects retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:VIEW permission")
    })
    public ResponseEntity<List<ProjectResponse>> getEmployeeProjects(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        List<ProjectResponse> projects = projectService.getEmployeeProjects(employeeId);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/employee/{employeeId}/allocations")
    @RequiresPermission(Permission.PROJECT_VIEW)
    @Operation(summary = "Get employee's allocations", description = "Returns the full allocation history (active and ended) for the specified employee")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Allocations retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires PROJECT:VIEW permission")
    })
    public ResponseEntity<List<ProjectEmployeeResponse>> getEmployeeAllocations(
            @Parameter(description = "Employee UUID") @PathVariable UUID employeeId) {
        List<ProjectEmployeeResponse> allocations = projectService.getEmployeeAllocations(employeeId);
        return ResponseEntity.ok(allocations);
    }
}
