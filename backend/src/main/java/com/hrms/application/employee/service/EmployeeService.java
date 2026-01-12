package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.api.employee.dto.UpdateEmployeeRequest;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
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

        return EmployeeResponse.fromEmployee(employee);
    }

    @Transactional
    public EmployeeResponse updateEmployee(UUID employeeId, UpdateEmployeeRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findById(employeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

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
        }

        // Update fields if provided
        if (request.getFirstName() != null) {
            employee.setFirstName(request.getFirstName());
            if (employee.getUser() != null) {
                employee.getUser().setFirstName(request.getFirstName());
            }
        }
        if (request.getMiddleName() != null) employee.setMiddleName(request.getMiddleName());
        if (request.getLastName() != null) {
            employee.setLastName(request.getLastName());
            if (employee.getUser() != null) {
                employee.getUser().setLastName(request.getLastName());
            }
        }
        if (request.getPersonalEmail() != null) employee.setPersonalEmail(request.getPersonalEmail());
        if (request.getPhoneNumber() != null) employee.setPhoneNumber(request.getPhoneNumber());
        if (request.getEmergencyContactNumber() != null) employee.setEmergencyContactNumber(request.getEmergencyContactNumber());
        if (request.getDateOfBirth() != null) employee.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null) employee.setGender(request.getGender());
        if (request.getAddress() != null) employee.setAddress(request.getAddress());
        if (request.getCity() != null) employee.setCity(request.getCity());
        if (request.getState() != null) employee.setState(request.getState());
        if (request.getPostalCode() != null) employee.setPostalCode(request.getPostalCode());
        if (request.getCountry() != null) employee.setCountry(request.getCountry());
        if (request.getConfirmationDate() != null) employee.setConfirmationDate(request.getConfirmationDate());
        if (request.getDepartmentId() != null) employee.setDepartmentId(request.getDepartmentId());
        if (request.getDesignation() != null) employee.setDesignation(request.getDesignation());
        if (request.getLevel() != null) employee.setLevel(request.getLevel());
        if (request.getJobRole() != null) employee.setJobRole(request.getJobRole());
        if (request.getManagerId() != null) employee.setManagerId(request.getManagerId());
        if (request.getEmploymentType() != null) employee.setEmploymentType(request.getEmploymentType());
        if (request.getStatus() != null) employee.setStatus(request.getStatus());
        if (request.getBankAccountNumber() != null) employee.setBankAccountNumber(request.getBankAccountNumber());
        if (request.getBankName() != null) employee.setBankName(request.getBankName());
        if (request.getBankIfscCode() != null) employee.setBankIfscCode(request.getBankIfscCode());
        if (request.getTaxId() != null) employee.setTaxId(request.getTaxId());

        employee = employeeRepository.save(employee);

        if (employee.getUser() != null) {
            userRepository.save(employee.getUser());
        }

        return EmployeeResponse.fromEmployee(employee);
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findById(employeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        EmployeeResponse response = EmployeeResponse.fromEmployee(employee);

        // Add manager name if exists
        if (employee.getManagerId() != null) {
            employeeRepository.findById(employee.getManagerId())
                    .ifPresent(manager -> response.setManagerName(manager.getFullName()));
        }

        return response;
    }

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> getAllEmployees(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.findAllByTenantId(tenantId, pageable)
                .map(EmployeeResponse::fromEmployee);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> searchEmployees(String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.searchEmployees(tenantId, search, pageable)
                .map(EmployeeResponse::fromEmployee);
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

    private List<EmployeeResponse> getSubordinatesRecursive(UUID managerId, UUID tenantId) {
        List<Employee> directSubordinates = new ArrayList<>();
        employeeRepository.findAllByManagerId(tenantId, managerId)
                .forEach(directSubordinates::add);

        return directSubordinates.stream()
                .map(subordinate -> {
                    EmployeeResponse response = EmployeeResponse.fromEmployee(subordinate);
                    List<EmployeeResponse> childSubordinates = getSubordinatesRecursive(subordinate.getId(), tenantId);
                    response.setSubordinates(childSubordinates);
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findById(employeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Mark as terminated instead of deleting
        employee.terminate();
        employeeRepository.save(employee);
    }
}
