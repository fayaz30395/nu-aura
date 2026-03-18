package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.api.employee.dto.UpdateEmployeeRequest;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.config.CacheConfig;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.event.employee.*;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private DomainEventPublisher eventPublisher;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = {CacheConfig.EMPLOYEES, CacheConfig.EMPLOYEE_WITH_DETAILS}, allEntries = true),
        @CacheEvict(value = CacheConfig.ANALYTICS_SUMMARY, allEntries = true),
        @CacheEvict(value = CacheConfig.DASHBOARD_METRICS, allEntries = true)
    })
    public EmployeeResponse createEmployee(CreateEmployeeRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if employee code already exists
        if (employeeRepository.existsByEmployeeCodeAndTenantId(request.getEmployeeCode(), tenantId)) {
            throw new DuplicateResourceException("Employee code already exists");
        }

        // Check if email already exists
        if (userRepository.findByEmailAndTenantId(request.getWorkEmail(), tenantId).isPresent()) {
            throw new DuplicateResourceException("Email already exists");
        }

        // Create user account for employee
        User user = User.builder()
                .email(request.getWorkEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName() != null ? request.getLastName() : "")
                .status(User.UserStatus.ACTIVE)
                .build();

        user.setTenantId(tenantId);
        user = userRepository.save(user);

        // Create employee record
        Employee employee = Employee.builder()
                .employeeCode(request.getEmployeeCode())
                .user(user)
                .firstName(request.getFirstName())
                .middleName(request.getMiddleName())
                .lastName(request.getLastName())
                .personalEmail(request.getPersonalEmail())
                .phoneNumber(request.getPhoneNumber())
                .emergencyContactNumber(request.getEmergencyContactNumber())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .country(request.getCountry())
                .joiningDate(request.getJoiningDate())
                .confirmationDate(request.getConfirmationDate())
                .departmentId(request.getDepartmentId())
                .designation(request.getDesignation())
                .managerId(request.getManagerId())
                .dottedLineManager1Id(request.getDottedLineManager1Id())
                .dottedLineManager2Id(request.getDottedLineManager2Id())
                .employmentType(request.getEmploymentType())
                .status(Employee.EmployeeStatus.ACTIVE)
                .bankAccountNumber(request.getBankAccountNumber())
                .bankName(request.getBankName())
                .bankIfscCode(request.getBankIfscCode())
                .taxId(request.getTaxId())
                .build();

        employee.setTenantId(tenantId);
        employee = employeeRepository.save(employee);

        // If selfManaged is true, set the managerId to the employee's own ID
        if (Boolean.TRUE.equals(request.getSelfManaged())) {
            employee.setManagerId(employee.getId());
            employee = employeeRepository.save(employee);
        }

        // Audit log: employee creation
        auditLogService.logAction(
                "EMPLOYEE",
                employee.getId(),
                AuditAction.CREATE,
                null,
                employee.getEmployeeCode() + " - " + employee.getFirstName() + " " + (employee.getLastName() != null ? employee.getLastName() : ""),
                "Employee created: " + employee.getEmployeeCode() + " (" + employee.getFirstName() + ") - Department: " + employee.getDepartmentId()
        );

        // Publish domain event for employee creation
        eventPublisher.publish(EmployeeCreatedEvent.of(this, employee));

        return EmployeeResponse.fromEmployee(employee);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = {CacheConfig.EMPLOYEES, CacheConfig.EMPLOYEE_WITH_DETAILS}, allEntries = true),
        @CacheEvict(value = CacheConfig.ANALYTICS_SUMMARY, allEntries = true),
        @CacheEvict(value = CacheConfig.DASHBOARD_METRICS, allEntries = true)
    })
    public EmployeeResponse updateEmployee(UUID employeeId, UpdateEmployeeRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findById(employeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Capture previous values for event tracking
        Employee.EmployeeStatus previousStatus = employee.getStatus();
        String previousDesignation = employee.getDesignation();
        Employee.EmployeeLevel previousLevel = employee.getLevel();
        UUID previousDepartmentId = employee.getDepartmentId();
        UUID previousManagerId = employee.getManagerId();
        Set<String> changedFields = new HashSet<>();

        // Update employee code if provided and different from current
        if (request.getEmployeeCode() != null && !request.getEmployeeCode().equals(employee.getEmployeeCode())) {
            // Check if new employee code already exists for another employee
            employeeRepository.findByEmployeeCodeAndTenantId(request.getEmployeeCode(), tenantId)
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(employeeId)) {
                            throw new DuplicateResourceException("Employee code already exists");
                        }
                    });
            employee.setEmployeeCode(request.getEmployeeCode());
            changedFields.add("employeeCode");
        }

        // Update fields if provided and track changes
        if (request.getFirstName() != null && !request.getFirstName().equals(employee.getFirstName())) {
            employee.setFirstName(request.getFirstName());
            if (employee.getUser() != null) {
                employee.getUser().setFirstName(request.getFirstName());
            }
            changedFields.add("firstName");
        }
        if (request.getMiddleName() != null && !Objects.equals(request.getMiddleName(), employee.getMiddleName())) {
            employee.setMiddleName(request.getMiddleName());
            changedFields.add("middleName");
        }
        if (request.getLastName() != null && !Objects.equals(request.getLastName(), employee.getLastName())) {
            employee.setLastName(request.getLastName());
            if (employee.getUser() != null) {
                employee.getUser().setLastName(request.getLastName());
            }
            changedFields.add("lastName");
        }
        if (request.getPersonalEmail() != null && !Objects.equals(request.getPersonalEmail(), employee.getPersonalEmail())) {
            employee.setPersonalEmail(request.getPersonalEmail());
            changedFields.add("personalEmail");
        }
        if (request.getPhoneNumber() != null && !Objects.equals(request.getPhoneNumber(), employee.getPhoneNumber())) {
            employee.setPhoneNumber(request.getPhoneNumber());
            changedFields.add("phoneNumber");
        }
        if (request.getEmergencyContactNumber() != null && !Objects.equals(request.getEmergencyContactNumber(), employee.getEmergencyContactNumber())) {
            employee.setEmergencyContactNumber(request.getEmergencyContactNumber());
            changedFields.add("emergencyContactNumber");
        }
        if (request.getDateOfBirth() != null && !Objects.equals(request.getDateOfBirth(), employee.getDateOfBirth())) {
            employee.setDateOfBirth(request.getDateOfBirth());
            changedFields.add("dateOfBirth");
        }
        if (request.getGender() != null && request.getGender() != employee.getGender()) {
            employee.setGender(request.getGender());
            changedFields.add("gender");
        }
        if (request.getAddress() != null && !Objects.equals(request.getAddress(), employee.getAddress())) {
            employee.setAddress(request.getAddress());
            changedFields.add("address");
        }
        if (request.getCity() != null && !Objects.equals(request.getCity(), employee.getCity())) {
            employee.setCity(request.getCity());
            changedFields.add("city");
        }
        if (request.getState() != null && !Objects.equals(request.getState(), employee.getState())) {
            employee.setState(request.getState());
            changedFields.add("state");
        }
        if (request.getPostalCode() != null && !Objects.equals(request.getPostalCode(), employee.getPostalCode())) {
            employee.setPostalCode(request.getPostalCode());
            changedFields.add("postalCode");
        }
        if (request.getCountry() != null && !Objects.equals(request.getCountry(), employee.getCountry())) {
            employee.setCountry(request.getCountry());
            changedFields.add("country");
        }
        if (request.getConfirmationDate() != null && !Objects.equals(request.getConfirmationDate(), employee.getConfirmationDate())) {
            employee.setConfirmationDate(request.getConfirmationDate());
            changedFields.add("confirmationDate");
        }
        if (request.getDepartmentId() != null && !Objects.equals(request.getDepartmentId(), employee.getDepartmentId())) {
            UUID oldDeptId = employee.getDepartmentId();
            employee.setDepartmentId(request.getDepartmentId());
            changedFields.add("departmentId");
            // Audit log: department change
            auditLogService.logAction(
                    "EMPLOYEE",
                    employeeId,
                    AuditAction.UPDATE,
                    oldDeptId != null ? oldDeptId.toString() : "N/A",
                    request.getDepartmentId().toString(),
                    "Employee department changed"
            );
        }
        if (request.getDesignation() != null && !Objects.equals(request.getDesignation(), employee.getDesignation())) {
            String oldDesignation = employee.getDesignation();
            employee.setDesignation(request.getDesignation());
            changedFields.add("designation");
            // Audit log: designation change
            auditLogService.logAction(
                    "EMPLOYEE",
                    employeeId,
                    AuditAction.UPDATE,
                    oldDesignation != null ? oldDesignation : "N/A",
                    request.getDesignation(),
                    "Employee designation changed"
            );
        }
        if (request.getLevel() != null && request.getLevel() != employee.getLevel()) {
            Employee.EmployeeLevel oldLevel = employee.getLevel();
            employee.setLevel(request.getLevel());
            changedFields.add("level");
            // Audit log: level change
            auditLogService.logAction(
                    "EMPLOYEE",
                    employeeId,
                    AuditAction.UPDATE,
                    oldLevel != null ? oldLevel.toString() : "N/A",
                    request.getLevel().toString(),
                    "Employee level changed"
            );
        }
        if (request.getJobRole() != null && request.getJobRole() != employee.getJobRole()) {
            employee.setJobRole(request.getJobRole());
            changedFields.add("jobRole");
        }
        if (request.getManagerId() != null && !Objects.equals(request.getManagerId(), employee.getManagerId())) {
            employee.setManagerId(request.getManagerId());
            changedFields.add("managerId");
        }
        if (request.getDottedLineManager1Id() != null && !Objects.equals(request.getDottedLineManager1Id(), employee.getDottedLineManager1Id())) {
            employee.setDottedLineManager1Id(request.getDottedLineManager1Id());
            changedFields.add("dottedLineManager1Id");
        }
        if (request.getDottedLineManager2Id() != null && !Objects.equals(request.getDottedLineManager2Id(), employee.getDottedLineManager2Id())) {
            employee.setDottedLineManager2Id(request.getDottedLineManager2Id());
            changedFields.add("dottedLineManager2Id");
        }
        if (request.getEmploymentType() != null && request.getEmploymentType() != employee.getEmploymentType()) {
            employee.setEmploymentType(request.getEmploymentType());
            changedFields.add("employmentType");
        }
        if (request.getStatus() != null && request.getStatus() != employee.getStatus()) {
            Employee.EmployeeStatus oldStatus = employee.getStatus();
            employee.setStatus(request.getStatus());
            changedFields.add("status");
            // Audit log: status change
            auditLogService.logAction(
                    "EMPLOYEE",
                    employeeId,
                    AuditAction.STATUS_CHANGE,
                    oldStatus != null ? oldStatus.toString() : "N/A",
                    request.getStatus().toString(),
                    "Employee status changed from " + oldStatus + " to " + request.getStatus()
            );
        }
        if (request.getBankAccountNumber() != null && !Objects.equals(request.getBankAccountNumber(), employee.getBankAccountNumber())) {
            employee.setBankAccountNumber(request.getBankAccountNumber());
            changedFields.add("bankAccountNumber");
        }
        if (request.getBankName() != null && !Objects.equals(request.getBankName(), employee.getBankName())) {
            employee.setBankName(request.getBankName());
            changedFields.add("bankName");
        }
        if (request.getBankIfscCode() != null && !Objects.equals(request.getBankIfscCode(), employee.getBankIfscCode())) {
            employee.setBankIfscCode(request.getBankIfscCode());
            changedFields.add("bankIfscCode");
        }
        if (request.getTaxId() != null && !Objects.equals(request.getTaxId(), employee.getTaxId())) {
            employee.setTaxId(request.getTaxId());
            changedFields.add("taxId");
        }

        employee = employeeRepository.save(employee);

        if (employee.getUser() != null) {
            userRepository.save(employee.getUser());
        }

        // Publish domain events based on what changed
        if (!changedFields.isEmpty()) {
            eventPublisher.publish(EmployeeUpdatedEvent.of(this, employee, changedFields));
        }

        // Check for status change
        if (changedFields.contains("status") && previousStatus != employee.getStatus()) {
            eventPublisher.publish(EmployeeStatusChangedEvent.of(this, employee, previousStatus, employee.getStatus()));
        }

        // Check for promotion (level or designation change)
        if ((changedFields.contains("level") || changedFields.contains("designation")) &&
            (previousLevel != employee.getLevel() || !Objects.equals(previousDesignation, employee.getDesignation()))) {
            eventPublisher.publish(EmployeePromotedEvent.of(this, employee,
                    previousDesignation, employee.getDesignation(),
                    previousLevel, employee.getLevel()));
        }

        // Check for department change
        if (changedFields.contains("departmentId") && !Objects.equals(previousDepartmentId, employee.getDepartmentId())) {
            eventPublisher.publish(EmployeeDepartmentChangedEvent.of(this, employee,
                    previousDepartmentId, employee.getDepartmentId(),
                    previousManagerId, employee.getManagerId()));
        }

        return EmployeeResponse.fromEmployee(employee);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.EMPLOYEE_WITH_DETAILS, key = "#employeeId", unless = "#result == null")
    public EmployeeResponse getEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findById(employeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        EmployeeResponse response = EmployeeResponse.fromEmployee(employee);

        // Batch-fetch related names in at most 2 queries instead of 4 individual lookups.
        // Collect all manager/dotted-line IDs, fetch them in a single findAllById, then map.
        Set<UUID> relatedEmployeeIds = new HashSet<>();
        if (employee.getManagerId() != null) relatedEmployeeIds.add(employee.getManagerId());
        if (employee.getDottedLineManager1Id() != null) relatedEmployeeIds.add(employee.getDottedLineManager1Id());
        if (employee.getDottedLineManager2Id() != null) relatedEmployeeIds.add(employee.getDottedLineManager2Id());

        if (!relatedEmployeeIds.isEmpty()) {
            Map<UUID, String> empNames = new HashMap<>();
            employeeRepository.findAllById(relatedEmployeeIds)
                    .forEach(emp -> empNames.put(emp.getId(), emp.getFullName()));

            if (employee.getManagerId() != null) {
                response.setManagerName(empNames.get(employee.getManagerId()));
            }
            if (employee.getDottedLineManager1Id() != null) {
                response.setDottedLineManager1Name(empNames.get(employee.getDottedLineManager1Id()));
            }
            if (employee.getDottedLineManager2Id() != null) {
                response.setDottedLineManager2Name(empNames.get(employee.getDottedLineManager2Id()));
            }
        }

        // Single department lookup (1 query instead of individual findById)
        if (employee.getDepartmentId() != null) {
            departmentRepository.findById(employee.getDepartmentId())
                    .ifPresent(dept -> response.setDepartmentName(dept.getName()));
        }

        return response;
    }

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> getAllEmployees(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<UUID, String> deptNames = buildDepartmentNameMap(tenantId);

        Page<Employee> employeePage = employeeRepository.findAllByTenantId(tenantId, pageable);
        Map<UUID, String> empNames = buildEmployeeNameMap(employeePage.getContent());

        return employeePage.map(emp -> enrichResponse(EmployeeResponse.fromEmployee(emp), deptNames, empNames));
    }

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> searchEmployees(String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<UUID, String> deptNames = buildDepartmentNameMap(tenantId);

        Page<Employee> employeePage = employeeRepository.searchEmployees(tenantId, search, pageable);
        Map<UUID, String> empNames = buildEmployeeNameMap(employeePage.getContent());

        return employeePage.map(emp -> enrichResponse(EmployeeResponse.fromEmployee(emp), deptNames, empNames));
    }

    /**
     * BUG-013 FIX: Return only employees whose level is MANAGER or above.
     * Previously the manager-picker dropdown used getAllEmployees(page=0, size=100)
     * which returned ALL employees — including ENTRY/MID/SENIOR contributors who
     * cannot serve as a reporting manager.  This creates confusion during onboarding
     * and can produce invalid reporting-line data.
     *
     * <p>Eligible manager levels: LEAD, MANAGER, SENIOR_MANAGER, DIRECTOR, VP, SVP, CXO.</p>
     */
    @Transactional(readOnly = true)
    public List<EmployeeResponse> getManagerEmployees() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Employee.EmployeeLevel> managerLevels = java.util.Arrays.asList(
                Employee.EmployeeLevel.LEAD,
                Employee.EmployeeLevel.MANAGER,
                Employee.EmployeeLevel.SENIOR_MANAGER,
                Employee.EmployeeLevel.DIRECTOR,
                Employee.EmployeeLevel.VP,
                Employee.EmployeeLevel.SVP,
                Employee.EmployeeLevel.CXO
        );
        List<Employee> managers = employeeRepository.findManagersByTenantId(tenantId, managerLevels);
        return managers.stream()
                .map(EmployeeResponse::fromEmployee)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EmployeeResponse> getSubordinates(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<Employee> subordinates = new ArrayList<>();
        employeeRepository.findAllByManagerId(tenantId, managerId)
                .forEach(subordinates::add);

        return subordinates.stream()
                .map(EmployeeResponse::fromEmployee)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getEmployeeHierarchy(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findById(employeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        EmployeeResponse response = EmployeeResponse.fromEmployee(employee);

        // Get subordinates recursively
        List<EmployeeResponse> subordinates = getSubordinatesRecursive(employee.getId(), tenantId);
        response.setSubordinates(subordinates);

        return response;
    }

    /** Maximum depth for recursive org-chart traversal (prevents OOM on circular/deep hierarchies). */
    private static final int MAX_HIERARCHY_DEPTH = 10;

    private List<EmployeeResponse> getSubordinatesRecursive(UUID managerId, UUID tenantId) {
        return getSubordinatesRecursive(managerId, tenantId, 0);
    }

    private List<EmployeeResponse> getSubordinatesRecursive(UUID managerId, UUID tenantId, int currentDepth) {
        if (currentDepth >= MAX_HIERARCHY_DEPTH) {
            return java.util.Collections.emptyList();
        }

        List<Employee> directSubordinates = new ArrayList<>();
        employeeRepository.findAllByManagerId(tenantId, managerId)
                .forEach(directSubordinates::add);

        return directSubordinates.stream()
                .map(subordinate -> {
                    EmployeeResponse response = EmployeeResponse.fromEmployee(subordinate);
                    List<EmployeeResponse> childSubordinates = getSubordinatesRecursive(
                            subordinate.getId(), tenantId, currentDepth + 1);
                    response.setSubordinates(childSubordinates);
                    return response;
                })
                .collect(Collectors.toList());
    }

    /**
     * Returns active employees who have the given manager assigned as
     * dotted-line manager 1 or dotted-line manager 2 (matrix reporting).
     */
    @Transactional(readOnly = true)
    public List<EmployeeResponse> getDottedLineReports(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Employee> reports = employeeRepository.findDottedLineReportsByManagerId(tenantId, managerId);
        Map<UUID, String> deptNames = buildDepartmentNameMap(tenantId);
        Map<UUID, String> empNames = buildEmployeeNameMap(reports);
        return reports.stream()
                .map(emp -> enrichResponse(EmployeeResponse.fromEmployee(emp), deptNames, empNames))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEmployee(UUID employeeId) {
        deleteEmployee(employeeId, "Terminated by administrator");
    }

    @Transactional
    public void deleteEmployee(UUID employeeId, String terminationReason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findById(employeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Mark as terminated instead of deleting
        employee.terminate();
        employeeRepository.save(employee);

        // Publish termination event
        eventPublisher.publish(EmployeeTerminatedEvent.of(this, employee, terminationReason));
    }

    /**
     * Retrieves an employee by ID with tenant isolation.
     * Used by controllers that need to verify employee exists and belongs to current tenant.
     *
     * @param employeeId the employee ID
     * @param tenantId the tenant ID
     * @return the employee
     * @throws ResourceNotFoundException if employee not found or doesn't belong to tenant
     */
    @Transactional(readOnly = true)
    public Employee getByIdAndTenant(UUID employeeId, UUID tenantId) {
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    /**
     * Retrieves an employee by ID with tenant isolation, returning Optional.
     * Useful when the caller wants to handle "not found" cases gracefully.
     *
     * @param employeeId the employee ID
     * @param tenantId the tenant ID
     * @return Optional containing the employee if found
     */
    @Transactional(readOnly = true)
    public java.util.Optional<Employee> findByIdAndTenant(UUID employeeId, UUID tenantId) {
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId);
    }

    /**
     * Retrieves an employee by their associated user ID with tenant isolation.
     *
     * @param userId the user ID linked to the employee
     * @return Optional containing the employee if found
     */
    @Transactional(readOnly = true)
    public java.util.Optional<Employee> getEmployeeByUserId(UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.findByUserIdAndTenantId(userId, tenantId);
    }

    // ==================== DTO Enrichment Helpers ====================

    /**
     * Enrich an EmployeeResponse with department name, manager name, and location name
     * by looking up related entities. This prevents N+1 queries by batching lookups.
     */
    private EmployeeResponse enrichResponse(EmployeeResponse response, Map<UUID, String> deptNames, Map<UUID, String> empNames) {
        if (response.getDepartmentId() != null && deptNames.containsKey(response.getDepartmentId())) {
            response.setDepartmentName(deptNames.get(response.getDepartmentId()));
        }
        if (response.getManagerId() != null && empNames.containsKey(response.getManagerId())) {
            response.setManagerName(empNames.get(response.getManagerId()));
        }
        if (response.getDottedLineManager1Id() != null && empNames.containsKey(response.getDottedLineManager1Id())) {
            response.setDottedLineManager1Name(empNames.get(response.getDottedLineManager1Id()));
        }
        if (response.getDottedLineManager2Id() != null && empNames.containsKey(response.getDottedLineManager2Id())) {
            response.setDottedLineManager2Name(empNames.get(response.getDottedLineManager2Id()));
        }
        return response;
    }

    /**
     * Build a department ID → name lookup map for the current tenant.
     */
    private Map<UUID, String> buildDepartmentNameMap(UUID tenantId) {
        return departmentRepository.findByTenantId(tenantId).stream()
                .collect(Collectors.toMap(Department::getId, Department::getName, (a, b) -> a));
    }

    /**
     * Build an employee ID → full name lookup map from a collection of employees.
     */
    private Map<UUID, String> buildEmployeeNameMap(Collection<Employee> employees) {
        return employees.stream()
                .collect(Collectors.toMap(Employee::getId, Employee::getFullName, (a, b) -> a));
    }
}
