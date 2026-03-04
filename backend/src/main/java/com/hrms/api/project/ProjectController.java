package com.hrms.api.project;

import com.hrms.api.project.dto.*;
import com.hrms.application.project.service.ProjectService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
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
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @PostMapping
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody CreateProjectRequest request) {
        ProjectResponse response = projectService.createProject(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<Page<ProjectResponse>> getAllProjects(
            @RequestParam(required = false) com.hrms.domain.project.Project.ProjectStatus status,
            @RequestParam(required = false) com.hrms.domain.project.Project.Priority priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<ProjectResponse> projects = projectService.getAllProjects(status, priority, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/search")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<Page<ProjectResponse>> searchProjects(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProjectResponse> projects = projectService.searchProjects(query, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<ProjectResponse> getProject(@PathVariable UUID id) {
        ProjectResponse response = projectService.getProject(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProjectRequest request) {
        ProjectResponse response = projectService.updateProject(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/assign")
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<ProjectEmployeeResponse> assignEmployee(
            @PathVariable UUID id,
            @Valid @RequestBody AssignEmployeeRequest request) {
        ProjectEmployeeResponse response = projectService.assignEmployee(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{projectId}/employees/{employeeId}")
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<Void> removeEmployeeFromProject(
            @PathVariable UUID projectId,
            @PathVariable UUID employeeId) {
        projectService.removeEmployeeFromProject(projectId, employeeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/team")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<List<ProjectEmployeeResponse>> getProjectTeamMembers(@PathVariable UUID id) {
        List<ProjectEmployeeResponse> teamMembers = projectService.getProjectTeamMembers(id);
        return ResponseEntity.ok(teamMembers);
    }

    @GetMapping("/{id}/allocations")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<Page<ProjectEmployeeResponse>> getProjectAllocations(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProjectEmployeeResponse> allocations = projectService.getProjectAllocations(id, pageable);
        return ResponseEntity.ok(allocations);
    }

    @PostMapping("/{id}/allocations/{memberId}/end")
    @RequiresPermission(Permission.PROJECT_CREATE)
    public ResponseEntity<ProjectEmployeeResponse> endAllocation(
            @PathVariable UUID id,
            @PathVariable UUID memberId) {
        ProjectEmployeeResponse response = projectService.endAllocation(id, memberId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<List<ProjectResponse>> getEmployeeProjects(@PathVariable UUID employeeId) {
        List<ProjectResponse> projects = projectService.getEmployeeProjects(employeeId);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/employee/{employeeId}/allocations")
    @RequiresPermission(Permission.PROJECT_VIEW)
    public ResponseEntity<List<ProjectEmployeeResponse>> getEmployeeAllocations(@PathVariable UUID employeeId) {
        List<ProjectEmployeeResponse> allocations = projectService.getEmployeeAllocations(employeeId);
        return ResponseEntity.ok(allocations);
    }
}
