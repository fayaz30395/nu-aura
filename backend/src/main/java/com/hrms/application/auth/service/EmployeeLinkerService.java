package com.hrms.application.auth.service;

import com.hrms.api.employee.dto.EmployeeResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for linking users to employees or creating new employee records.
 * Primarily used for SuperAdmin users and other users without employee profiles.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeLinkerService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogService auditLogService;

    /**
     * Link an existing employee to a user or create a new employee record if none exists.
     *
     * Strategy:
     * 1. Find the user by ID
     * 2. Check if an employee already exists for this user
     * 3. If not, try to find an existing employee with matching email
     * 4. If still no employee, create a minimal employee record
     *
     * @param userId the user ID to link/create employee for
     * @return EmployeeResponse containing the linked/created employee
     * @throws ResourceNotFoundException if user not found
     */
    @Transactional
    public EmployeeResponse linkOrCreateEmployeeForUser(UUID userId) {
        // Find the user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        UUID tenantId = user.getTenantId();
        TenantContext.setCurrentTenant(tenantId);

        // Check if employee already exists for this user
        Optional<Employee> existingEmployee = employeeRepository.findByUserIdAndTenantId(userId, tenantId);
        if (existingEmployee.isPresent()) {
            log.info("Employee already exists for user {}", userId);
            return EmployeeResponse.fromEmployee(existingEmployee.get());
        }

        // Try to find an existing employee with matching email
        List<Employee> matchingByEmail = employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getUser() != null && e.getUser().getEmail().equals(user.getEmail()))
                .toList();

        Employee linkedEmployee;
        if (!matchingByEmail.isEmpty()) {
            // Link the first matching employee to this user
            linkedEmployee = matchingByEmail.get(0);
            linkedEmployee.setUser(user);
            linkedEmployee = employeeRepository.save(linkedEmployee);

            auditLogService.logAction(
                    "EMPLOYEE",
                    linkedEmployee.getId(),
                    AuditAction.UPDATE,
                    null,
                    "Linked to user " + user.getEmail(),
                    "Employee linked to user account"
            );

            log.info("Linked existing employee {} to user {}", linkedEmployee.getId(), userId);
        } else {
            // Create a new minimal employee record
            String[] nameParts = user.getFullName().split(" ", 2);
            String firstName = nameParts[0];
            String lastName = nameParts.length > 1 ? nameParts[1] : "";

            // Generate a unique employee code
            String employeeCode = "USR-" + user.getId().toString().substring(0, 8).toUpperCase();

            linkedEmployee = Employee.builder()
                    .employeeCode(employeeCode)
                    .user(user)
                    .firstName(firstName)
                    .lastName(lastName)
                    .joiningDate(LocalDate.now())
                    .employmentType(Employee.EmploymentType.FULL_TIME)
                    .status(Employee.EmployeeStatus.ACTIVE)
                    .tenantId(tenantId)
                    .build();

            linkedEmployee = employeeRepository.save(linkedEmployee);

            auditLogService.logAction(
                    "EMPLOYEE",
                    linkedEmployee.getId(),
                    AuditAction.CREATE,
                    null,
                    linkedEmployee.getEmployeeCode() + " - " + linkedEmployee.getFirstName(),
                    "Auto-created minimal employee record for user account"
            );

            log.info("Created new employee record for user {} with employee ID {}", userId, linkedEmployee.getId());
        }

        return EmployeeResponse.fromEmployee(linkedEmployee);
    }
}
