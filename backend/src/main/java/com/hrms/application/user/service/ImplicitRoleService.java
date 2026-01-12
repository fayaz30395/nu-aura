package com.hrms.application.user.service;

import com.hrms.common.security.RoleHierarchy;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service to compute implicit roles based on employee relationships.
 * Implicit roles are dynamically assigned based on:
 * - REPORTING_MANAGER: Has direct reports
 * - SKIP_LEVEL_MANAGER: Has indirect reports (reports to their reports)
 * - DEPARTMENT_HEAD: Heads a department
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImplicitRoleService {

    private final EmployeeRepository employeeRepository;

    /**
     * Get implicit roles for an employee based on their relationships.
     */
    public Set<String> getImplicitRoles(UUID employeeId, UUID tenantId) {
        Set<String> implicitRoles = new HashSet<>();

        // Check if employee has direct reports
        Long directReportCount = employeeRepository.countDirectReportsByManagerId(tenantId, employeeId);
        if (directReportCount > 0) {
            implicitRoles.add(RoleHierarchy.REPORTING_MANAGER);
            log.debug("Employee {} has {} direct reports, granting REPORTING_MANAGER", employeeId, directReportCount);

            // Check for skip-level reports (2nd level)
            List<UUID> directReportIds = employeeRepository.findEmployeeIdsByManagerIds(tenantId, List.of(employeeId));
            if (!directReportIds.isEmpty()) {
                List<UUID> skipLevelReports = employeeRepository.findEmployeeIdsByManagerIds(tenantId, directReportIds);
                if (!skipLevelReports.isEmpty()) {
                    implicitRoles.add(RoleHierarchy.SKIP_LEVEL_MANAGER);
                    log.debug("Employee {} has {} skip-level reports, granting SKIP_LEVEL_MANAGER",
                            employeeId, skipLevelReports.size());
                }
            }
        }

        return implicitRoles;
    }

    /**
     * Get all permissions for an employee including implicit role permissions.
     */
    public Set<String> getImplicitPermissions(UUID employeeId, UUID tenantId) {
        Set<String> permissions = new HashSet<>();
        Set<String> implicitRoles = getImplicitRoles(employeeId, tenantId);

        for (String role : implicitRoles) {
            permissions.addAll(RoleHierarchy.getDefaultPermissions(role));
        }

        return permissions;
    }
}
