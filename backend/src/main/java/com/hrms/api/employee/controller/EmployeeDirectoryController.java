package com.hrms.api.employee.controller;

import com.hrms.api.employee.dto.EmployeeDirectoryResponse;
import com.hrms.api.employee.dto.EmployeeSearchRequest;
import com.hrms.application.employee.service.EmployeeDirectoryService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.UUID;

/**
 * Employee Directory API for searching and browsing employees.
 *
 * <p>Provides advanced search capabilities with filtering by department,
 * job role, level, employment type, and reporting hierarchy.</p>
 */
@RestController
@RequestMapping("/api/v1/employees/directory")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Employee Directory", description = "Search and browse employee directory")
public class EmployeeDirectoryController {

    private final EmployeeDirectoryService employeeDirectoryService;

    @PostMapping("/search")
    @Operation(
            summary = "Search employees with advanced filters",
            description = """
                    Search employees using multiple filter criteria. Supports full-text search,
                    department filtering, role-based filtering, and hierarchical queries.

                    **Permission Scopes:**
                    - `EMPLOYEE:VIEW_ALL` - View all employees in tenant
                    - `EMPLOYEE:VIEW_DEPARTMENT` - View employees in user's department
                    - `EMPLOYEE:VIEW_TEAM` - View direct and indirect reports
                    - `EMPLOYEE:VIEW_SELF` - View own profile only
                    """,
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Search criteria",
                    required = true,
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = EmployeeSearchRequest.class),
                            examples = @ExampleObject(
                                    name = "Search by name and department",
                                    value = """
                                            {
                                              "searchTerm": "John",
                                              "departmentIds": ["550e8400-e29b-41d4-a716-446655440001"],
                                              "statuses": ["ACTIVE"],
                                              "page": 0,
                                              "size": 20,
                                              "sortBy": "fullName",
                                              "sortDirection": "ASC"
                                            }
                                            """
                            )
                    )
            )
    )
    @ApiResponses.GetList
    @RequiresPermission({
            Permission.EMPLOYEE_VIEW_ALL,
            Permission.EMPLOYEE_VIEW_DEPARTMENT,
            Permission.EMPLOYEE_VIEW_TEAM,
            Permission.EMPLOYEE_VIEW_SELF
    })
    public ResponseEntity<Page<EmployeeDirectoryResponse>> searchEmployees(
            @Valid @RequestBody EmployeeSearchRequest request
    ) {
        log.info("Received employee directory search request: {}", request);
        Page<EmployeeDirectoryResponse> results = employeeDirectoryService.searchEmployees(request);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/search")
    @Operation(
            summary = "Search employees via query parameters",
            description = """
                    Alternative to POST search using query parameters. Useful for bookmarkable URLs
                    and simple integrations. Multiple values can be comma-separated.
                    """
    )
    @ApiResponses.GetList
    @RequiresPermission({
            Permission.EMPLOYEE_VIEW_ALL,
            Permission.EMPLOYEE_VIEW_DEPARTMENT,
            Permission.EMPLOYEE_VIEW_TEAM,
            Permission.EMPLOYEE_VIEW_SELF
    })
    public ResponseEntity<Page<EmployeeDirectoryResponse>> searchEmployeesGet(
            @Parameter(description = "Free text search (name, email, employee code)", example = "john")
            @RequestParam(required = false) String searchTerm,
            @Parameter(description = "Comma-separated department UUIDs", example = "550e8400-e29b-41d4-a716-446655440001")
            @RequestParam(required = false) String departmentIds,
            @Parameter(description = "Comma-separated job roles", example = "DEVELOPER,MANAGER")
            @RequestParam(required = false) String jobRoles,
            @Parameter(description = "Comma-separated levels", example = "SENIOR,MID")
            @RequestParam(required = false) String levels,
            @Parameter(description = "Comma-separated employment types", example = "FULL_TIME,CONTRACT")
            @RequestParam(required = false) String employmentTypes,
            @Parameter(description = "Comma-separated statuses", example = "ACTIVE")
            @RequestParam(required = false) String statuses,
            @Parameter(description = "Filter by manager UUID (direct reports)")
            @RequestParam(required = false) String managerId,
            @Parameter(description = "Page number (0-indexed)", example = "0")
            @RequestParam(defaultValue = "0") Integer page,
            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") Integer size,
            @Parameter(description = "Sort field", example = "fullName")
            @RequestParam(defaultValue = "fullName") String sortBy,
            @Parameter(description = "Sort direction", example = "ASC", schema = @Schema(allowableValues = {"ASC", "DESC"}))
            @RequestParam(defaultValue = "ASC") String sortDirection
    ) {
        EmployeeSearchRequest request = EmployeeSearchRequest.builder()
                .searchTerm(searchTerm)
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        // Parse comma-separated IDs and enums if provided
        if (departmentIds != null && !departmentIds.isEmpty()) {
            request.setDepartmentIds(java.util.Arrays.stream(departmentIds.split(","))
                    .map(UUID::fromString)
                    .collect(java.util.stream.Collectors.toList()));
        }

        if (jobRoles != null && !jobRoles.isEmpty()) {
            request.setJobRoles(java.util.Arrays.asList(jobRoles.split(",")));
        }

        if (levels != null && !levels.isEmpty()) {
            request.setLevels(java.util.Arrays.asList(levels.split(",")));
        }

        if (employmentTypes != null && !employmentTypes.isEmpty()) {
            request.setEmploymentTypes(java.util.Arrays.asList(employmentTypes.split(",")));
        }

        if (statuses != null && !statuses.isEmpty()) {
            request.setStatuses(java.util.Arrays.asList(statuses.split(",")));
        }

        if (managerId != null && !managerId.isEmpty()) {
            request.setManagerId(UUID.fromString(managerId));
        }

        log.info("Received employee directory GET search request: {}", request);
        Page<EmployeeDirectoryResponse> results = employeeDirectoryService.searchEmployees(request);
        return ResponseEntity.ok(results);
    }
}
