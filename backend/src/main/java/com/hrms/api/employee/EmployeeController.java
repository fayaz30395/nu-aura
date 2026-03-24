package com.hrms.api.employee;

import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.api.employee.dto.UpdateEmployeeRequest;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/employees")
@Tag(name = "Employees", description = "Employee management APIs for CRUD operations and hierarchy")
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    @PostMapping
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
    @Operation(summary = "Create a new employee", description = "Creates a new employee record with user account")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Employee created successfully",
            content = @Content(schema = @Schema(implementation = EmployeeResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "409", description = "Employee code or email already exists")
    })
    public ResponseEntity<EmployeeResponse> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse response = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    @Operation(summary = "Get all employees", description = "Returns a paginated list of employees filtered by caller's data scope")
    @ApiResponse(responseCode = "200", description = "Employees retrieved successfully")
    public ResponseEntity<Page<EmployeeResponse>> getAllEmployees(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (ASC/DESC)") @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<EmployeeResponse> employees = employeeService.getAllEmployees(pageable);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/search")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    @Operation(summary = "Search employees", description = "Search employees by name, email, or employee code")
    @ApiResponse(responseCode = "200", description = "Search results retrieved successfully")
    public ResponseEntity<Page<EmployeeResponse>> searchEmployees(
            @Parameter(description = "Search query string") @RequestParam(required = false) String query,
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size
    ) {
        // BUG-002 FIX: Handle null/empty query gracefully - return all employees instead of 500 error
        String searchQuery = (query == null || query.trim().isEmpty()) ? "" : query.trim();
        Pageable pageable = PageRequest.of(page, size);
        Page<EmployeeResponse> employees = employeeService.searchEmployees(searchQuery, pageable);
        return ResponseEntity.ok(employees);
    }

    /**
     * Self-service: returns the authenticated user's own employee profile without
     * requiring the caller to know their own UUID. Avoids a second round-trip to
     * discover the ID and ensures the backend always resolves the correct record.
     */
    @GetMapping("/me")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Get current user's own employee profile")
    public ResponseEntity<EmployeeResponse> getMyEmployee() {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(employeeService.getEmployee(employeeId));
    }

    /**
     * Self-service: update the authenticated user's own profile.
     * Only allows personal/contact fields — administrative fields
     * (department, status, designation, etc.) are silently ignored.
     */
    @PutMapping("/me")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Update current user's own profile (self-service)")
    public ResponseEntity<EmployeeResponse> updateMyEmployee(
            @Valid @RequestBody UpdateEmployeeRequest request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId == null) {
            return ResponseEntity.notFound().build();
        }

        // Restrict to self-service fields only — clear admin-only fields
        UpdateEmployeeRequest selfServiceRequest = new UpdateEmployeeRequest();
        selfServiceRequest.setPersonalEmail(request.getPersonalEmail());
        selfServiceRequest.setPhoneNumber(request.getPhoneNumber());
        selfServiceRequest.setEmergencyContactNumber(request.getEmergencyContactNumber());
        selfServiceRequest.setAddress(request.getAddress());
        selfServiceRequest.setCity(request.getCity());
        selfServiceRequest.setState(request.getState());
        selfServiceRequest.setPostalCode(request.getPostalCode());
        selfServiceRequest.setCountry(request.getCountry());

        EmployeeResponse response = employeeService.updateEmployee(employeeId, selfServiceRequest);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    @Operation(summary = "Get employee by ID", description = "Returns a single employee by their UUID, enforcing data-scope rules")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Employee found"),
        @ApiResponse(responseCode = "403", description = "Not authorized to view this employee"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<EmployeeResponse> getEmployee(
            @Parameter(description = "Employee UUID") @PathVariable UUID id) {
        // CRITICAL-04 FIX: Enforce data-scope on single-record GET to prevent IDOR.
        // SuperAdmin bypass is already handled by PermissionAspect before this code runs.
        enforceEmployeeViewScope(id);
        EmployeeResponse response = employeeService.getEmployee(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Enforces data-scope rules for viewing a single employee record.
     * Scope hierarchy: VIEW_ALL > VIEW_DEPARTMENT > VIEW_TEAM > VIEW_SELF.
     * SuperAdmin is already bypassed at the @RequiresPermission aspect level.
     */
    private void enforceEmployeeViewScope(UUID targetEmployeeId) {
        // VIEW_ALL: can see any employee within the tenant
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
            return;
        }

        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // VIEW_SELF: can only see own record
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) {
            return;
        }

        // VIEW_DEPARTMENT: can see employees in the same department
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_DEPARTMENT)) {
            // Fetch target employee to check department — delegated to service layer
            EmployeeResponse target = employeeService.getEmployee(targetEmployeeId);
            UUID currentDeptId = SecurityContext.getCurrentDepartmentId();
            if (currentDeptId != null && target.getDepartmentId() != null
                    && currentDeptId.equals(target.getDepartmentId())) {
                return;
            }
        }

        // VIEW_TEAM: can see direct/indirect reportees
        if (SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_TEAM)) {
            Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
            if (reporteeIds.contains(targetEmployeeId)) {
                return;
            }
        }

        throw new AccessDeniedException(
                "You are not authorized to view this employee record");
    }

    @GetMapping("/{id}/hierarchy")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    @Operation(summary = "Get employee hierarchy", description = "Returns the employee with their full reporting hierarchy")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Employee hierarchy retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<EmployeeResponse> getEmployeeHierarchy(
            @Parameter(description = "Employee UUID") @PathVariable UUID id) {
        EmployeeResponse response = employeeService.getEmployeeHierarchy(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/subordinates")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    @Operation(summary = "Get subordinates", description = "Returns direct reports of the specified employee")
    @ApiResponse(responseCode = "200", description = "Subordinates retrieved successfully")
    public ResponseEntity<List<EmployeeResponse>> getSubordinates(
            @Parameter(description = "Manager UUID") @PathVariable UUID id) {
        List<EmployeeResponse> subordinates = employeeService.getSubordinates(id);
        return ResponseEntity.ok(subordinates);
    }

    /**
     * BUG-013 FIX: Return only employees with managerial levels (LEAD and above)
     * for use in the manager-picker dropdown during employee onboarding / editing.
     * Avoids loading the entire employee list when only a small subset is valid.
     */
    @GetMapping("/managers")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_CREATE,
        Permission.EMPLOYEE_UPDATE
    })
    @Operation(summary = "Get eligible managers",
               description = "Returns active employees at LEAD level and above, for manager-picker dropdowns")
    public ResponseEntity<List<EmployeeResponse>> getManagers() {
        return ResponseEntity.ok(employeeService.getManagerEmployees());
    }

    @GetMapping("/{id}/dotted-reports")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    @Operation(summary = "Get dotted-line reports",
               description = "Returns active employees who have this manager assigned as a dotted-line manager")
    @ApiResponse(responseCode = "200", description = "Dotted-line reports retrieved successfully")
    public ResponseEntity<List<EmployeeResponse>> getDottedLineReports(
            @Parameter(description = "Manager UUID") @PathVariable UUID id) {
        List<EmployeeResponse> reports = employeeService.getDottedLineReports(id);
        return ResponseEntity.ok(reports);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Update employee", description = "Update an existing employee's information")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Employee updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<EmployeeResponse> updateEmployee(
            @Parameter(description = "Employee UUID") @PathVariable UUID id,
            @Valid @RequestBody UpdateEmployeeRequest request
    ) {
        EmployeeResponse response = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    @Operation(summary = "Delete employee", description = "Soft-delete an employee record")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Employee deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<Void> deleteEmployee(
            @Parameter(description = "Employee UUID") @PathVariable UUID id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }
}
