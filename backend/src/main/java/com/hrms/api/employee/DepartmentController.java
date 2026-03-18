package com.hrms.api.employee;

import com.hrms.api.employee.dto.DepartmentRequest;
import com.hrms.api.employee.dto.DepartmentResponse;
import com.hrms.application.employee.service.DepartmentService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for department management.
 * Provides CRUD operations for organizational departments.
 */
@RestController
@RequestMapping("/api/v1/departments")
@Tag(name = "Departments", description = "Department management endpoints for organizational structure")
// SECURITY FIX (P1.2): Removed @CrossOrigin(origins = "*") - use global CORS config
public class DepartmentController {

    @Autowired
    private DepartmentService departmentService;

    @PostMapping
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    @Operation(summary = "Create department", description = "Create a new department in the organization")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Department created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "409", description = "Department with same name already exists")
    })
    public ResponseEntity<DepartmentResponse> createDepartment(
            @Valid @RequestBody DepartmentRequest request) {
        DepartmentResponse response = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    @Operation(summary = "Update department", description = "Update an existing department")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Department updated successfully"),
        @ApiResponse(responseCode = "404", description = "Department not found"),
        @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    public ResponseEntity<DepartmentResponse> updateDepartment(
            @Parameter(description = "Department UUID") @PathVariable UUID id,
            @Valid @RequestBody DepartmentRequest request) {
        DepartmentResponse response = departmentService.updateDepartment(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    @Operation(summary = "Get department by ID", description = "Retrieve a single department by its UUID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Department found"),
        @ApiResponse(responseCode = "404", description = "Department not found")
    })
    public ResponseEntity<DepartmentResponse> getDepartment(
            @Parameter(description = "Department UUID") @PathVariable UUID id) {
        DepartmentResponse response = departmentService.getDepartment(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    @Operation(summary = "Get all departments", description = "Retrieve paginated list of all departments")
    @ApiResponse(responseCode = "200", description = "Departments retrieved successfully")
    public ResponseEntity<Page<DepartmentResponse>> getAllDepartments(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<DepartmentResponse> response = departmentService.getAllDepartments(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    @Operation(summary = "Get active departments", description = "Retrieve list of all active departments")
    @ApiResponse(responseCode = "200", description = "Active departments retrieved successfully")
    public ResponseEntity<List<DepartmentResponse>> getActiveDepartments() {
        List<DepartmentResponse> response = departmentService.getActiveDepartments();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/hierarchy")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    @Operation(summary = "Get department hierarchy", description = "Retrieve department tree structure with parent-child relationships")
    @ApiResponse(responseCode = "200", description = "Department hierarchy retrieved successfully")
    public ResponseEntity<List<DepartmentResponse>> getDepartmentHierarchy() {
        List<DepartmentResponse> response = departmentService.getDepartmentHierarchy();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    @Operation(summary = "Search departments", description = "Search departments by name or code")
    @ApiResponse(responseCode = "200", description = "Search results retrieved successfully")
    public ResponseEntity<Page<DepartmentResponse>> searchDepartments(
            @Parameter(description = "Search query string") @RequestParam String query,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<DepartmentResponse> response = departmentService.searchDepartments(query, pageable);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/activate")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    @Operation(summary = "Activate department", description = "Activate a deactivated department")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Department activated successfully"),
        @ApiResponse(responseCode = "404", description = "Department not found")
    })
    public ResponseEntity<DepartmentResponse> activateDepartment(
            @Parameter(description = "Department UUID") @PathVariable UUID id) {
        DepartmentResponse response = departmentService.activateDepartment(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/deactivate")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    @Operation(summary = "Deactivate department", description = "Deactivate an active department")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Department deactivated successfully"),
        @ApiResponse(responseCode = "404", description = "Department not found"),
        @ApiResponse(responseCode = "409", description = "Cannot deactivate department with active employees")
    })
    public ResponseEntity<DepartmentResponse> deactivateDepartment(
            @Parameter(description = "Department UUID") @PathVariable UUID id) {
        DepartmentResponse response = departmentService.deactivateDepartment(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    @Operation(summary = "Delete department", description = "Permanently delete a department")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Department deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Department not found"),
        @ApiResponse(responseCode = "409", description = "Cannot delete department with employees")
    })
    public ResponseEntity<Void> deleteDepartment(
            @Parameter(description = "Department UUID") @PathVariable UUID id) {
        departmentService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }
}
