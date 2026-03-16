package com.hrms.api.employee;

import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.api.employee.dto.UpdateEmployeeRequest;
import com.hrms.application.employee.service.EmployeeService;
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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    @Operation(summary = "Get all employees", description = "Returns a paginated list of employees")
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
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    public ResponseEntity<Page<EmployeeResponse>> searchEmployees(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<EmployeeResponse> employees = employeeService.searchEmployees(query, pageable);
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/{id}")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    @Operation(summary = "Get employee by ID", description = "Returns a single employee by their UUID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Employee found"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<EmployeeResponse> getEmployee(
            @Parameter(description = "Employee UUID") @PathVariable UUID id) {
        EmployeeResponse response = employeeService.getEmployee(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/hierarchy")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    public ResponseEntity<EmployeeResponse> getEmployeeHierarchy(@PathVariable UUID id) {
        EmployeeResponse response = employeeService.getEmployeeHierarchy(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/subordinates")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM
    })
    public ResponseEntity<List<EmployeeResponse>> getSubordinates(@PathVariable UUID id) {
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
        Permission.EMPLOYEE_VIEW_SELF
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
    public ResponseEntity<EmployeeResponse> updateEmployee(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEmployeeRequest request
    ) {
        EmployeeResponse response = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.EMPLOYEE_DELETE)
    public ResponseEntity<Void> deleteEmployee(@PathVariable UUID id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }
}
