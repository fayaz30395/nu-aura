package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.DepartmentRequest;
import com.hrms.api.employee.dto.DepartmentResponse;
import com.hrms.common.config.CacheConfig;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.employee.Department;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DepartmentService {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional
    @CacheEvict(value = CacheConfig.DEPARTMENTS, allEntries = true)
    public DepartmentResponse createDepartment(DepartmentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (departmentRepository.existsByCodeAndTenantId(request.getCode(), tenantId)) {
            throw new DuplicateResourceException("Department code already exists");
        }

        Department department = Department.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .parentDepartmentId(request.getParentDepartmentId())
                .managerId(request.getManagerId())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .location(request.getLocation())
                .costCenter(request.getCostCenter())
                .type(request.getType())
                .build();

        department.setTenantId(tenantId);
        department = departmentRepository.save(department);

        return enrichDepartmentResponse(department);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.DEPARTMENTS, allEntries = true)
    public DepartmentResponse updateDepartment(UUID id, DepartmentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Department department = departmentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        if (request.getCode() != null && !request.getCode().equals(department.getCode())) {
            if (departmentRepository.existsByCodeAndTenantId(request.getCode(), tenantId)) {
                throw new DuplicateResourceException("Department code already exists");
            }
            department.setCode(request.getCode());
        }

        if (request.getName() != null)
            department.setName(request.getName());
        if (request.getDescription() != null)
            department.setDescription(request.getDescription());
        if (request.getParentDepartmentId() != null)
            department.setParentDepartmentId(request.getParentDepartmentId());
        if (request.getManagerId() != null)
            department.setManagerId(request.getManagerId());
        if (request.getIsActive() != null)
            department.setIsActive(request.getIsActive());
        if (request.getLocation() != null)
            department.setLocation(request.getLocation());
        if (request.getCostCenter() != null)
            department.setCostCenter(request.getCostCenter());
        if (request.getType() != null)
            department.setType(request.getType());

        department = departmentRepository.save(department);

        return enrichDepartmentResponse(department);
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getDepartment(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Department department = departmentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        return enrichDepartmentResponse(department);
    }

    @Transactional(readOnly = true)
    public Page<DepartmentResponse> getAllDepartments(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return departmentRepository.findAllByTenantId(tenantId, pageable)
                .map(this::enrichDepartmentResponse);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.DEPARTMENTS, key = "'active:' + T(com.hrms.common.security.TenantContext).getCurrentTenant()")
    public List<DepartmentResponse> getActiveDepartments() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return departmentRepository.findAllByTenantIdAndIsActive(tenantId, true)
                .stream()
                .map(this::enrichDepartmentResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getDepartmentHierarchy() {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Department> rootDepartments = departmentRepository.findRootDepartments(tenantId);

        return rootDepartments.stream()
                .map(this::buildDepartmentTree)
                .collect(Collectors.toList());
    }

    private DepartmentResponse buildDepartmentTree(Department department) {
        UUID tenantId = TenantContext.getCurrentTenant();

        DepartmentResponse response = enrichDepartmentResponse(department);

        List<Department> subDepartments = departmentRepository
                .findAllByTenantIdAndParentDepartmentId(tenantId, department.getId());

        List<DepartmentResponse> subResponses = subDepartments.stream()
                .map(this::buildDepartmentTree)
                .collect(Collectors.toList());

        response.setSubDepartments(subResponses);

        return response;
    }

    @Transactional(readOnly = true)
    public Page<DepartmentResponse> searchDepartments(String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return departmentRepository.searchDepartments(tenantId, search, pageable)
                .map(this::enrichDepartmentResponse);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.DEPARTMENTS, allEntries = true)
    public void deleteDepartment(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Department department = departmentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        long employeeCount = employeeRepository.countByDepartmentIdAndTenantId(department.getId(), tenantId);
        if (employeeCount > 0) {
            throw new BusinessException("Cannot delete department with employees. Please reassign employees first.");
        }

        long subDeptCount = departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, id);
        if (subDeptCount > 0) {
            throw new BusinessException("Cannot delete department with sub-departments.");
        }

        department.softDelete();
        departmentRepository.save(department);

        auditLogService.logAction(
                "DEPARTMENT",
                department.getId(),
                AuditAction.DELETE,
                department.getName(),
                null,
                "Department soft-deleted: " + department.getCode() + " (" + department.getName() + ")"
        );
    }

    @Transactional
    @CacheEvict(value = CacheConfig.DEPARTMENTS, allEntries = true)
    public DepartmentResponse deactivateDepartment(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Department department = departmentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        department.setIsActive(false);
        department = departmentRepository.save(department);

        return enrichDepartmentResponse(department);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.DEPARTMENTS, allEntries = true)
    public DepartmentResponse activateDepartment(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Department department = departmentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        department.setIsActive(true);
        department = departmentRepository.save(department);

        return enrichDepartmentResponse(department);
    }

    private DepartmentResponse enrichDepartmentResponse(Department department) {
        UUID tenantId = TenantContext.getCurrentTenant();

        DepartmentResponse response = DepartmentResponse.fromDepartment(department);

        // Add parent department name
        if (department.getParentDepartmentId() != null) {
            departmentRepository.findById(department.getParentDepartmentId())
                    .ifPresent(parent -> response.setParentDepartmentName(parent.getName()));
        }

        // Add manager name
        if (department.getManagerId() != null) {
            employeeRepository.findById(department.getManagerId())
                    .ifPresent(manager -> response.setManagerName(manager.getFullName()));
        }

        // Add employee count - count all employees in this department regardless of status (BUG-004 fix)
        // Changed to include ALL employees (not just ACTIVE) so frontend can accurately display department staffing
        long empCount = employeeRepository.countByDepartmentIdAndTenantId(department.getId(), tenantId);
        response.setEmployeeCount(empCount);

        // Add sub-department count
        long subDeptCount = departmentRepository.countByTenantIdAndParentDepartmentId(tenantId, department.getId());
        response.setSubDepartmentCount(subDeptCount);

        return response;
    }
}
