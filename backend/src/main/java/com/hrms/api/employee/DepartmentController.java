package com.hrms.api.employee;

import com.hrms.api.employee.dto.DepartmentRequest;
import com.hrms.api.employee.dto.DepartmentResponse;
import com.hrms.application.employee.service.DepartmentService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
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

@RestController
@RequestMapping("/api/v1/departments")
@CrossOrigin(origins = "*")
public class DepartmentController {

    @Autowired
    private DepartmentService departmentService;

    @PostMapping
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    public ResponseEntity<DepartmentResponse> createDepartment(
            @Valid @RequestBody DepartmentRequest request) {
        DepartmentResponse response = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    public ResponseEntity<DepartmentResponse> updateDepartment(
            @PathVariable UUID id,
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
    public ResponseEntity<DepartmentResponse> getDepartment(@PathVariable UUID id) {
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
    public ResponseEntity<Page<DepartmentResponse>> getAllDepartments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
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
    public ResponseEntity<Page<DepartmentResponse>> searchDepartments(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<DepartmentResponse> response = departmentService.searchDepartments(query, pageable);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/activate")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    public ResponseEntity<DepartmentResponse> activateDepartment(@PathVariable UUID id) {
        DepartmentResponse response = departmentService.activateDepartment(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/deactivate")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    public ResponseEntity<DepartmentResponse> deactivateDepartment(@PathVariable UUID id) {
        DepartmentResponse response = departmentService.deactivateDepartment(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.DEPARTMENT_MANAGE)
    public ResponseEntity<Void> deleteDepartment(@PathVariable UUID id) {
        departmentService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }
}
