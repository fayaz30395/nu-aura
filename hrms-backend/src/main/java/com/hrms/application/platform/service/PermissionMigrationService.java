package com.hrms.application.platform.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.platform.*;
import com.hrms.domain.user.Permission;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.platform.repository.*;
import com.hrms.infrastructure.user.repository.PermissionRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to migrate existing legacy permissions to the new NU Platform RBAC system.
 *
 * This migration:
 * 1. Maps legacy Permission entities to AppPermission entities
 * 2. Maps legacy Role entities to AppRole entities
 * 3. Creates UserAppAccess records for all users based on their legacy roles
 *
 * Legacy format: EMPLOYEE:READ, LEAVE:APPROVE
 * New format: HRMS:EMPLOYEE:READ, HRMS:LEAVE:APPROVE
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionMigrationService {

    private final NuApplicationRepository applicationRepository;
    private final AppPermissionRepository appPermissionRepository;
    private final AppRoleRepository appRoleRepository;
    private final UserAppAccessRepository userAppAccessRepository;
    private final PermissionRepository legacyPermissionRepository;
    private final RoleRepository legacyRoleRepository;
    private final UserRepository userRepository;

    /**
     * Run the full migration for a specific tenant
     */
    @Transactional
    public MigrationResult migrateForTenant(UUID tenantId) {
        log.info("Starting permission migration for tenant: {}", tenantId);
        TenantContext.setCurrentTenant(tenantId);

        MigrationResult result = new MigrationResult();

        try {
            // Get HRMS application
            NuApplication hrmsApp = applicationRepository.findByCode(HrmsPermissionInitializer.APP_CODE)
                    .orElseThrow(() -> new RuntimeException("HRMS application not found. Run HrmsPermissionInitializer first."));

            // Step 1: Migrate permissions
            int permissionsMigrated = migratePermissions(hrmsApp, tenantId, result);
            result.setPermissionsMigrated(permissionsMigrated);

            // Step 2: Migrate roles
            int rolesMigrated = migrateRoles(hrmsApp, tenantId, result);
            result.setRolesMigrated(rolesMigrated);

            // Step 3: Create user app access records
            int usersProcessed = migrateUserAccess(hrmsApp, tenantId, result);
            result.setUsersProcessed(usersProcessed);

            result.setSuccess(true);
            log.info("Migration completed successfully for tenant {}. Permissions: {}, Roles: {}, Users: {}",
                    tenantId, permissionsMigrated, rolesMigrated, usersProcessed);

        } catch (Exception e) {
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
            log.error("Migration failed for tenant {}: {}", tenantId, e.getMessage(), e);
        } finally {
            TenantContext.clear();
        }

        return result;
    }

    /**
     * Migrate legacy permissions to AppPermissions
     */
    private int migratePermissions(NuApplication app, UUID tenantId, MigrationResult result) {
        List<Permission> legacyPermissions = legacyPermissionRepository.findAll();
        int migrated = 0;

        for (Permission legacy : legacyPermissions) {
            String legacyCode = legacy.getCode();
            String newCode;

            // Convert legacy code to new format
            if (legacyCode.startsWith("HRMS:")) {
                newCode = legacyCode; // Already in new format
            } else if (legacyCode.contains(":")) {
                newCode = "HRMS:" + legacyCode; // Add app prefix
            } else {
                // Single word permissions like "SYSTEM_ADMIN"
                newCode = "HRMS:SYSTEM:" + legacyCode;
            }

            // Check if already exists
            if (!appPermissionRepository.existsByCode(newCode)) {
                // Parse module and action from code
                String[] parts = newCode.split(":");
                String module = parts.length > 1 ? parts[1] : "SYSTEM";
                String action = parts.length > 2 ? parts[2] : parts[parts.length - 1];

                AppPermission appPermission = AppPermission.builder()
                        .application(app)
                        .code(newCode)
                        .module(module)
                        .action(action)
                        .name(legacy.getName())
                        .description(legacy.getDescription())
                        .category(mapCategory(module))
                        .isSystemPermission(legacyCode.contains("ADMIN"))
                        .build();

                appPermissionRepository.save(appPermission);
                migrated++;
                result.addMappedPermission(legacyCode, newCode);
                log.debug("Migrated permission: {} -> {}", legacyCode, newCode);
            }
        }

        return migrated;
    }

    /**
     * Migrate legacy roles to AppRoles
     */
    private int migrateRoles(NuApplication app, UUID tenantId, MigrationResult result) {
        List<Role> legacyRoles = legacyRoleRepository.findByTenantId(tenantId);
        int migrated = 0;

        for (Role legacy : legacyRoles) {
            String roleCode = legacy.getCode();

            // Check if role already exists in platform
            if (appRoleRepository.existsByCodeAndTenantIdAndApplicationId(roleCode, tenantId, app.getId())) {
                log.debug("Role {} already exists, skipping", roleCode);
                continue;
            }

            // Map legacy permissions to new permission codes
            Set<String> newPermissionCodes = legacy.getPermissions().stream()
                    .map(p -> mapPermissionCode(p.getCode()))
                    .collect(Collectors.toSet());

            // Create AppRole
            AppRole appRole = AppRole.builder()
                    .application(app)
                    .code(roleCode)
                    .name(legacy.getName())
                    .description(legacy.getDescription())
                    .level(mapRoleLevel(roleCode))
                    .isSystemRole(isSystemRole(roleCode))
                    .isDefaultRole("EMPLOYEE".equals(roleCode))
                    .build();
            appRole.setTenantId(tenantId);

            // Add permissions
            List<AppPermission> appPermissions = appPermissionRepository.findByCodeIn(newPermissionCodes);
            for (AppPermission perm : appPermissions) {
                if (perm.getApplication().getId().equals(app.getId())) {
                    appRole.getPermissions().add(perm);
                }
            }

            appRoleRepository.save(appRole);
            migrated++;
            result.addMappedRole(roleCode, newPermissionCodes.size());
            log.debug("Migrated role: {} with {} permissions", roleCode, appRole.getPermissions().size());
        }

        return migrated;
    }

    /**
     * Create UserAppAccess records for all users
     */
    private int migrateUserAccess(NuApplication app, UUID tenantId, MigrationResult result) {
        List<User> users = new ArrayList<>();
        userRepository.findAllByTenantId(tenantId).forEach(users::add);
        int processed = 0;

        for (User user : users) {
            // Check if user already has access
            if (userAppAccessRepository.existsByUserIdAndApplicationIdAndStatus(
                    user.getId(), app.getId(), UserAppAccess.AccessStatus.ACTIVE)) {
                log.debug("User {} already has access, skipping", user.getEmail());
                continue;
            }

            // Get user's legacy roles
            Set<String> roleCodes = user.getRoles().stream()
                    .map(Role::getCode)
                    .collect(Collectors.toSet());

            if (roleCodes.isEmpty()) {
                roleCodes.add("EMPLOYEE"); // Assign default role
            }

            // Create UserAppAccess
            UserAppAccess access = UserAppAccess.builder()
                    .user(user)
                    .application(app)
                    .status(UserAppAccess.AccessStatus.ACTIVE)
                    .grantedAt(LocalDateTime.now())
                    .build();
            access.setTenantId(tenantId);

            // Add roles
            for (String roleCode : roleCodes) {
                appRoleRepository.findByCodeAndTenantIdAndApplicationId(roleCode, tenantId, app.getId())
                        .ifPresent(access::addRole);
            }

            // If no platform roles found, try to assign default role
            if (access.getRoles().isEmpty()) {
                appRoleRepository.findByTenantIdAndApplicationIdAndIsDefaultRoleTrue(tenantId, app.getId())
                        .ifPresent(access::addRole);
            }

            userAppAccessRepository.save(access);
            processed++;
            result.addProcessedUser(user.getEmail(), new ArrayList<>(roleCodes));
            log.debug("Created access for user: {} with roles: {}", user.getEmail(), roleCodes);
        }

        return processed;
    }

    /**
     * Map legacy permission code to new format
     */
    private String mapPermissionCode(String legacyCode) {
        if (legacyCode.startsWith("HRMS:")) {
            return legacyCode;
        }
        if (legacyCode.contains(":")) {
            return "HRMS:" + legacyCode;
        }
        return "HRMS:SYSTEM:" + legacyCode;
    }

    /**
     * Map module to category
     */
    private String mapCategory(String module) {
        Map<String, String> categoryMap = Map.of(
                "EMPLOYEE", "Core HR",
                "DEPARTMENT", "Organization",
                "ATTENDANCE", "Attendance",
                "LEAVE", "Leave",
                "PAYROLL", "Payroll",
                "PERFORMANCE", "Performance",
                "RECRUITMENT", "Recruitment",
                "REPORT", "Reports",
                "ANNOUNCEMENT", "Communication",
                "SYSTEM", "Admin"
        );
        return categoryMap.getOrDefault(module, "Other");
    }

    /**
     * Map role code to level
     */
    private int mapRoleLevel(String roleCode) {
        Map<String, Integer> levelMap = Map.of(
                "SUPER_ADMIN", 100,
                "SYSTEM_ADMIN", 100,
                "TENANT_ADMIN", 95,
                "CEO", 90,
                "HR_MANAGER", 80,
                "DEPARTMENT_MANAGER", 60,
                "TEAM_LEAD", 40,
                "EMPLOYEE", 10
        );
        return levelMap.getOrDefault(roleCode, 50);
    }

    /**
     * Check if role is a system role
     */
    private boolean isSystemRole(String roleCode) {
        return roleCode.equals("SUPER_ADMIN") || roleCode.equals("SYSTEM_ADMIN");
    }

    /**
     * Migration result container
     */
    public static class MigrationResult {
        private boolean success;
        private String errorMessage;
        private int permissionsMigrated;
        private int rolesMigrated;
        private int usersProcessed;
        private final Map<String, String> mappedPermissions = new LinkedHashMap<>();
        private final Map<String, Integer> mappedRoles = new LinkedHashMap<>();
        private final Map<String, List<String>> processedUsers = new LinkedHashMap<>();

        // Getters and setters
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        public int getPermissionsMigrated() { return permissionsMigrated; }
        public void setPermissionsMigrated(int permissionsMigrated) { this.permissionsMigrated = permissionsMigrated; }
        public int getRolesMigrated() { return rolesMigrated; }
        public void setRolesMigrated(int rolesMigrated) { this.rolesMigrated = rolesMigrated; }
        public int getUsersProcessed() { return usersProcessed; }
        public void setUsersProcessed(int usersProcessed) { this.usersProcessed = usersProcessed; }
        public Map<String, String> getMappedPermissions() { return mappedPermissions; }
        public Map<String, Integer> getMappedRoles() { return mappedRoles; }
        public Map<String, List<String>> getProcessedUsers() { return processedUsers; }

        public void addMappedPermission(String oldCode, String newCode) {
            mappedPermissions.put(oldCode, newCode);
        }

        public void addMappedRole(String roleCode, int permissionCount) {
            mappedRoles.put(roleCode, permissionCount);
        }

        public void addProcessedUser(String email, List<String> roles) {
            processedUsers.put(email, roles);
        }
    }
}
