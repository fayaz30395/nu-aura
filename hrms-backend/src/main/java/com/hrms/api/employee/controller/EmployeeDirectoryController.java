package com.hrms.api.employee.controller;

import com.hrms.api.employee.dto.EmployeeDirectoryResponse;
import com.hrms.api.employee.dto.EmployeeSearchRequest;
import com.hrms.application.employee.service.EmployeeDirectoryService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/employees/directory")
@RequiredArgsConstructor
@Slf4j
public class EmployeeDirectoryController {

    private final EmployeeDirectoryService employeeDirectoryService;

    @PostMapping("/search")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    public ResponseEntity<Page<EmployeeDirectoryResponse>> searchEmployees(
        @RequestBody EmployeeSearchRequest request
    ) {
        log.info("Received employee directory search request: {}", request);
        Page<EmployeeDirectoryResponse> results = employeeDirectoryService.searchEmployees(request);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/search")
    @RequiresPermission({
        Permission.EMPLOYEE_VIEW_ALL,
        Permission.EMPLOYEE_VIEW_DEPARTMENT,
        Permission.EMPLOYEE_VIEW_TEAM,
        Permission.EMPLOYEE_VIEW_SELF
    })
    public ResponseEntity<Page<EmployeeDirectoryResponse>> searchEmployeesGet(
        @RequestParam(required = false) String searchTerm,
        @RequestParam(required = false) String departmentIds,
        @RequestParam(required = false) String jobRoles,
        @RequestParam(required = false) String levels,
        @RequestParam(required = false) String employmentTypes,
        @RequestParam(required = false) String statuses,
        @RequestParam(required = false) String managerId,
        @RequestParam(defaultValue = "0") Integer page,
        @RequestParam(defaultValue = "20") Integer size,
        @RequestParam(defaultValue = "fullName") String sortBy,
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
                .map(java.util.UUID::fromString)
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
            request.setManagerId(java.util.UUID.fromString(managerId));
        }

        log.info("Received employee directory GET search request: {}", request);
        Page<EmployeeDirectoryResponse> results = employeeDirectoryService.searchEmployees(request);
        return ResponseEntity.ok(results);
    }
}
