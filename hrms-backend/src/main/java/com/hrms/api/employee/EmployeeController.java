package com.hrms.api.employee;

import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.api.employee.dto.UpdateEmployeeRequest;
import com.hrms.application.employee.service.EmployeeService;
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
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    @PostMapping
    @RequiresPermission(Permission.EMPLOYEE_CREATE)
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
    public ResponseEntity<Page<EmployeeResponse>> getAllEmployees(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
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
    public ResponseEntity<EmployeeResponse> getEmployee(@PathVariable UUID id) {
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
