package com.hrms.application.platform.service;

import com.hrms.domain.platform.*;
import com.hrms.infrastructure.platform.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Initializes default HRMS roles for tenants.
 * Creates standard roles like System Admin, HR Manager, Employee, etc.
 * Runs after HrmsPermissionInitializer.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2) // Run after HrmsPermissionInitializer
public class HrmsRoleInitializer {

        private static final UUID DEFAULT_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

        private final NuApplicationRepository applicationRepository;
        private final AppPermissionRepository permissionRepository;
        private final AppRoleRepository roleRepository;
        private final TenantApplicationRepository tenantApplicationRepository;

        @PostConstruct
        @Transactional
        public void initialize() {
                log.info("Initializing default HRMS roles...");

                NuApplication hrmsApp = applicationRepository.findByCode(HrmsPermissionInitializer.APP_CODE)
                                .orElse(null);

                if (hrmsApp == null) {
                        log.warn("HRMS application not found. Skipping role initialization.");
                        return;
                }

                // Enable HRMS for default tenant if not already
                enableHrmsForTenant(hrmsApp, DEFAULT_TENANT_ID);

                // Create default roles for the default tenant
                createDefaultRoles(hrmsApp, DEFAULT_TENANT_ID);

                log.info("Default HRMS roles initialized successfully");
        }

        private void enableHrmsForTenant(NuApplication app, UUID tenantId) {
                Optional<TenantApplication> existing = tenantApplicationRepository
                                .findByTenantIdAndApplicationId(tenantId, app.getId());

                if (existing.isEmpty()) {
                        TenantApplication ta = TenantApplication.builder()
                                        .application(app)
                                        .status(TenantApplication.SubscriptionStatus.ACTIVE)
                                        .activatedAt(LocalDateTime.now())
                                        .subscriptionTier("ENTERPRISE")
                                        .maxUsers(1000)
                                        .build();
                        ta.setTenantId(tenantId);
                        tenantApplicationRepository.save(ta);
                        log.info("Enabled HRMS for tenant: {}", tenantId);
                }
        }

        private void createDefaultRoles(NuApplication app, UUID tenantId) {
                // Super Admin - Full access
                createRoleIfNotExists(app, tenantId, "SUPER_ADMIN", "Super Administrator",
                                "Full system administration access", 100, true, false,
                                Set.of(HrmsPermissionInitializer.SYSTEM_ADMIN));

                // HR Manager - Full HR operations
                createRoleIfNotExists(app, tenantId, "HR_MANAGER", "HR Manager",
                                "Complete HR management access", 80, false, false,
                                Set.of(
                                                HrmsPermissionInitializer.EMPLOYEE_READ,
                                                HrmsPermissionInitializer.EMPLOYEE_CREATE,
                                                HrmsPermissionInitializer.EMPLOYEE_UPDATE,
                                                HrmsPermissionInitializer.EMPLOYEE_DELETE,
                                                HrmsPermissionInitializer.EMPLOYEE_VIEW_ALL,
                                                HrmsPermissionInitializer.ATTENDANCE_READ,
                                                HrmsPermissionInitializer.ATTENDANCE_MANAGE,
                                                HrmsPermissionInitializer.ATTENDANCE_APPROVE,
                                                HrmsPermissionInitializer.ATTENDANCE_VIEW_ALL,
                                                HrmsPermissionInitializer.LEAVE_READ,
                                                HrmsPermissionInitializer.LEAVE_APPROVE,
                                                HrmsPermissionInitializer.LEAVE_MANAGE,
                                                HrmsPermissionInitializer.LEAVE_VIEW_ALL,
                                                HrmsPermissionInitializer.PAYROLL_READ,
                                                HrmsPermissionInitializer.PAYROLL_MANAGE,
                                                HrmsPermissionInitializer.PAYROLL_RUN,
                                                HrmsPermissionInitializer.PAYROLL_APPROVE,
                                                HrmsPermissionInitializer.REPORT_VIEW,
                                                HrmsPermissionInitializer.REPORT_CREATE,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_READ,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_CREATE,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_MANAGE,
                                                HrmsPermissionInitializer.PROJECT_VIEW,
                                                HrmsPermissionInitializer.PROJECT_CREATE,
                                                HrmsPermissionInitializer.PROJECT_UPDATE,
                                                HrmsPermissionInitializer.PROJECT_DELETE,
                                                HrmsPermissionInitializer.PROJECT_ASSIGN,
                                                HrmsPermissionInitializer.ROLE_READ,
                                                HrmsPermissionInitializer.USER_READ));

                // Department Manager - Department level access
                createRoleIfNotExists(app, tenantId, "DEPARTMENT_MANAGER", "Department Manager",
                                "Department management access", 60, false, false,
                                Set.of(
                                                HrmsPermissionInitializer.EMPLOYEE_READ,
                                                HrmsPermissionInitializer.EMPLOYEE_VIEW_DEPARTMENT,
                                                HrmsPermissionInitializer.ATTENDANCE_READ,
                                                HrmsPermissionInitializer.ATTENDANCE_APPROVE,
                                                "HRMS:ATTENDANCE:VIEW_TEAM",
                                                HrmsPermissionInitializer.LEAVE_READ,
                                                HrmsPermissionInitializer.LEAVE_APPROVE,
                                                "HRMS:LEAVE:VIEW_TEAM",
                                                HrmsPermissionInitializer.PROJECT_VIEW,
                                                HrmsPermissionInitializer.PROJECT_CREATE,
                                                HrmsPermissionInitializer.PROJECT_ASSIGN,
                                                HrmsPermissionInitializer.REPORT_VIEW,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_READ));

                // Team Lead - Team level access
                createRoleIfNotExists(app, tenantId, "TEAM_LEAD", "Team Lead",
                                "Team management access", 40, false, false,
                                Set.of(
                                                HrmsPermissionInitializer.EMPLOYEE_READ,
                                                HrmsPermissionInitializer.EMPLOYEE_VIEW_TEAM,
                                                HrmsPermissionInitializer.ATTENDANCE_READ,
                                                "HRMS:ATTENDANCE:VIEW_TEAM",
                                                HrmsPermissionInitializer.LEAVE_READ,
                                                HrmsPermissionInitializer.LEAVE_APPROVE,
                                                "HRMS:LEAVE:VIEW_TEAM",
                                                HrmsPermissionInitializer.PROJECT_VIEW,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_READ));

                // Employee - Basic self-service access (default role)
                createRoleIfNotExists(app, tenantId, "EMPLOYEE", "Employee",
                                "Basic employee self-service access", 10, false, true,
                                Set.of(
                                                HrmsPermissionInitializer.EMPLOYEE_VIEW_SELF,
                                                HrmsPermissionInitializer.ATTENDANCE_READ,
                                                HrmsPermissionInitializer.ATTENDANCE_MARK,
                                                "HRMS:ATTENDANCE:REGULARIZE",
                                                HrmsPermissionInitializer.LEAVE_READ,
                                                HrmsPermissionInitializer.LEAVE_REQUEST,
                                                HrmsPermissionInitializer.PAYROLL_VIEW_PAYSLIP,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_READ));

                // CEO - Executive access
                createRoleIfNotExists(app, tenantId, "CEO", "Chief Executive Officer",
                                "Executive level access with full visibility", 90, false, false,
                                Set.of(
                                                HrmsPermissionInitializer.EMPLOYEE_READ,
                                                HrmsPermissionInitializer.EMPLOYEE_VIEW_ALL,
                                                HrmsPermissionInitializer.ATTENDANCE_READ,
                                                HrmsPermissionInitializer.ATTENDANCE_VIEW_ALL,
                                                HrmsPermissionInitializer.LEAVE_READ,
                                                HrmsPermissionInitializer.LEAVE_VIEW_ALL,
                                                HrmsPermissionInitializer.PAYROLL_READ,
                                                HrmsPermissionInitializer.REPORT_VIEW,
                                                HrmsPermissionInitializer.REPORT_CREATE,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_READ,
                                                HrmsPermissionInitializer.ANNOUNCEMENT_CREATE));
        }

        private void createRoleIfNotExists(NuApplication app, UUID tenantId, String code, String name,
                        String description, int level, boolean isSystem, boolean isDefault,
                        Set<String> permissionCodes) {
                if (roleRepository.existsByCodeAndTenantIdAndApplicationId(code, tenantId, app.getId())) {
                        log.debug("Role {} already exists for tenant {}", code, tenantId);
                        return;
                }

                AppRole role = AppRole.builder()
                                .application(app)
                                .code(code)
                                .name(name)
                                .description(description)
                                .level(level)
                                .isSystemRole(isSystem)
                                .isDefaultRole(isDefault)
                                .build();
                role.setTenantId(tenantId);

                // Add permissions
                List<AppPermission> permissions = permissionRepository.findByCodeIn(permissionCodes);
                for (AppPermission perm : permissions) {
                        if (perm.getApplication().getId().equals(app.getId())) {
                                role.getPermissions().add(perm);
                        }
                }

                roleRepository.save(role);
                log.info("Created role: {} with {} permissions", code, role.getPermissions().size());
        }
}
