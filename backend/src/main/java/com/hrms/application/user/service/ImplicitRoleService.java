package com.hrms.application.user.service;

import com.hrms.common.security.RoleHierarchy;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

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
     * Optimized: uses a single query to fetch direct report IDs, then one more
     * for skip-level check (max 2 queries instead of 3).
     */
    @Transactional(readOnly = true)
    public Set<String> getImplicitRoles(UUID employeeId, UUID tenantId) {
        Set<String> implicitRoles = new HashSet<>();

        // Single query: fetch direct report IDs (replaces separate COUNT + SELECT)
        List<UUID> directReportIds = employeeRepository.findEmployeeIdsByManagerIds(tenantId, List.of(employeeId));
        if (!directReportIds.isEmpty()) {
            implicitRoles.add(RoleHierarchy.REPORTING_MANAGER);
            log.debug("Employee {} has {} direct reports, granting REPORTING_MANAGER", employeeId, directReportIds.size());

            // Check for skip-level reports (2nd level) — only if direct reports exist
            List<UUID> skipLevelReports = employeeRepository.findEmployeeIdsByManagerIds(tenantId, directReportIds);
            if (!skipLevelReports.isEmpty()) {
                implicitRoles.add(RoleHierarchy.SKIP_LEVEL_MANAGER);
                log.debug("Employee {} has {} skip-level reports, granting SKIP_LEVEL_MANAGER",
                        employeeId, skipLevelReports.size());
            }
        }

        return implicitRoles;
    }

    /**
     * Get all permissions for an employee including implicit role permissions.
     */
    @Transactional(readOnly = true)
    public Set<String> getImplicitPermissions(UUID employeeId, UUID tenantId) {
        Set<String> permissions = new HashSet<>();
        Set<String> implicitRoles = getImplicitRoles(employeeId, tenantId);

        for (String role : implicitRoles) {
            permissions.addAll(RoleHierarchy.getDefaultPermissions(role));
        }

        return permissions;
    }
}
