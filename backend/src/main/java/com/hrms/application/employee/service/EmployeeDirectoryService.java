package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.EmployeeDirectoryResponse;
import com.hrms.api.employee.dto.EmployeeSearchRequest;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeDirectoryService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final DataScopeService dataScopeService;

    @Transactional(readOnly = true)
    public Page<EmployeeDirectoryResponse> searchEmployees(EmployeeSearchRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Searching employees for tenant: {} with filters: {}", tenantId, request);

        // Build specification for dynamic query
        String permission = determineViewPermission();
        Specification<Employee> scopeSpec = dataScopeService.getScopeSpecification(permission);
        Specification<Employee> spec = Specification.where(scopeSpec).and(buildSpecification(tenantId, request));

        // Create pageable with sorting
        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                buildSort(request.getSortBy(), request.getSortDirection())
        );

        // Execute query
        Page<Employee> employeesPage = employeeRepository.findAll(spec, pageable);

        // Fetch departments for mapping
        Set<UUID> departmentIds = employeesPage.getContent().stream()
                .map(Employee::getDepartmentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, Department> departmentMap = departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(Department::getId, d -> d));

        // Fetch managers for mapping
        Set<UUID> managerIds = employeesPage.getContent().stream()
                .map(Employee::getManagerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, Employee> managerMap = employeeRepository.findAllById(managerIds).stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));

        // Map to response
        return employeesPage.map(employee -> mapToDirectoryResponse(employee, departmentMap, managerMap));
    }

    private Specification<Employee> buildSpecification(UUID tenantId, EmployeeSearchRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Tenant filter (always required)
            predicates.add(cb.equal(root.get("tenantId"), tenantId));

            // Search term filter
            if (request.getSearchTerm() != null && !request.getSearchTerm().trim().isEmpty()) {
                String searchPattern = "%" + request.getSearchTerm().toLowerCase() + "%";
                // Employee entity has firstName + lastName, not fullName or workEmail
                Predicate firstNamePredicate = cb.like(cb.lower(root.get("firstName")), searchPattern);
                Predicate lastNamePredicate = cb.like(cb.lower(root.get("lastName")), searchPattern);
                Predicate emailPredicate = cb.like(cb.lower(root.get("personalEmail")), searchPattern);
                Predicate phonePredicate = cb.like(cb.lower(root.get("phoneNumber")), searchPattern);
                Predicate codePredicate = cb.like(cb.lower(root.get("employeeCode")), searchPattern);

                predicates.add(cb.or(firstNamePredicate, lastNamePredicate, emailPredicate, phonePredicate, codePredicate));
            }

            // Department filter
            if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
                predicates.add(root.get("departmentId").in(request.getDepartmentIds()));
            }

            // Job role filter
            if (request.getJobRoles() != null && !request.getJobRoles().isEmpty()) {
                List<Employee.JobRole> jobRoles = request.getJobRoles().stream()
                        .map(Employee.JobRole::valueOf)
                        .collect(Collectors.toList());
                predicates.add(root.get("jobRole").in(jobRoles));
            }

            // Level filter
            if (request.getLevels() != null && !request.getLevels().isEmpty()) {
                List<Employee.EmployeeLevel> levels = request.getLevels().stream()
                        .map(Employee.EmployeeLevel::valueOf)
                        .collect(Collectors.toList());
                predicates.add(root.get("level").in(levels));
            }

            // Employment type filter
            if (request.getEmploymentTypes() != null && !request.getEmploymentTypes().isEmpty()) {
                List<Employee.EmploymentType> types = request.getEmploymentTypes().stream()
                        .map(Employee.EmploymentType::valueOf)
                        .collect(Collectors.toList());
                predicates.add(root.get("employmentType").in(types));
            }

            // Status filter
            if (request.getStatuses() != null && !request.getStatuses().isEmpty()) {
                List<Employee.EmployeeStatus> statuses = request.getStatuses().stream()
                        .map(Employee.EmployeeStatus::valueOf)
                        .collect(Collectors.toList());
                predicates.add(root.get("status").in(statuses));
            }

            // Manager filter
            if (request.getManagerId() != null) {
                predicates.add(cb.equal(root.get("managerId"), request.getManagerId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String determineViewPermission() {
        if (SecurityContext.getPermissionScope(Permission.EMPLOYEE_VIEW_ALL) != null) {
            return Permission.EMPLOYEE_VIEW_ALL;
        }
        if (SecurityContext.getPermissionScope(Permission.EMPLOYEE_VIEW_DEPARTMENT) != null) {
            return Permission.EMPLOYEE_VIEW_DEPARTMENT;
        }
        if (SecurityContext.getPermissionScope(Permission.EMPLOYEE_VIEW_TEAM) != null) {
            return Permission.EMPLOYEE_VIEW_TEAM;
        }
        if (SecurityContext.getPermissionScope(Permission.EMPLOYEE_VIEW_SELF) != null) {
            return Permission.EMPLOYEE_VIEW_SELF;
        }
        if (SecurityContext.getPermissionScope(Permission.EMPLOYEE_READ) != null) {
            return Permission.EMPLOYEE_READ;
        }

        return Permission.EMPLOYEE_VIEW_SELF;
    }

    private Sort buildSort(String sortBy, String sortDirection) {
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        // Map sortBy fields that don't exist on Employee entity to valid fields
        String resolvedSortBy = sortBy;
        if ("fullName".equals(sortBy) || "name".equals(sortBy)) {
            resolvedSortBy = "firstName";
        } else if ("workEmail".equals(sortBy)) {
            resolvedSortBy = "personalEmail";
        }

        return Sort.by(direction, resolvedSortBy != null ? resolvedSortBy : "firstName");
    }

    private EmployeeDirectoryResponse mapToDirectoryResponse(
            Employee employee,
            Map<UUID, Department> departmentMap,
            Map<UUID, Employee> managerMap
    ) {
        Department department = employee.getDepartmentId() != null
                ? departmentMap.get(employee.getDepartmentId())
                : null;

        Employee manager = employee.getManagerId() != null
                ? managerMap.get(employee.getManagerId())
                : null;

        // Build full name from firstName + lastName since Employee entity has no fullName field
        String fullName = employee.getFirstName() != null ? employee.getFirstName() : "";
        if (employee.getLastName() != null && !employee.getLastName().isEmpty()) {
            fullName = fullName.isEmpty() ? employee.getLastName() : fullName + " " + employee.getLastName();
        }

        return EmployeeDirectoryResponse.builder()
                .id(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .fullName(fullName)
                .personalEmail(employee.getPersonalEmail())
                .workEmail(employee.getPersonalEmail()) // Employee entity has no workEmail; fallback to personalEmail
                .phoneNumber(employee.getPhoneNumber())
                .departmentId(employee.getDepartmentId())
                .departmentName(department != null ? department.getName() : null)
                .designation(employee.getDesignation())
                .jobRole(employee.getJobRole() != null ? employee.getJobRole().name() : null)
                .level(employee.getLevel() != null ? employee.getLevel().name() : null)
                .employmentType(employee.getEmploymentType() != null ? employee.getEmploymentType().name() : null)
                .managerId(employee.getManagerId())
                .managerName(manager != null ? manager.getFullName() : null)
                .joiningDate(employee.getJoiningDate())
                .exitDate(employee.getExitDate())
                .status(employee.getStatus() != null ? employee.getStatus().name() : null)
                .profileImageUrl(null) // To be implemented with file storage
                .build();
    }
}
