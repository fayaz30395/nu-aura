package com.hrms.application.platform.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.platform.*;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.platform.repository.*;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Core service for NU Platform operations.
 * Handles application registration, user access management, and cross-app permissions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NuPlatformService {

    private final NuApplicationRepository applicationRepository;
    private final AppPermissionRepository permissionRepository;
    private final AppRoleRepository roleRepository;
    private final UserAppAccessRepository userAppAccessRepository;
    private final TenantApplicationRepository tenantApplicationRepository;
    private final UserRepository userRepository;

    // ==================== Application Management ====================

    /**
     * Register a new NU application
     */
    public NuApplication registerApplication(String code, String name, String description,
                                             String baseUrl, String apiBasePath) {
        if (applicationRepository.existsByCode(code)) {
            throw new IllegalArgumentException("Application with code " + code + " already exists");
        }

        NuApplication app = NuApplication.builder()
            .code(code.toUpperCase())
            .name(name)
            .description(description)
            .baseUrl(baseUrl)
            .apiBasePath(apiBasePath)
            .status(NuApplication.ApplicationStatus.ACTIVE)
            .isSystemApp(false)
            .build();

        app = applicationRepository.save(app);
        log.info("Registered new application: {} ({})", name, code);
        return app;
    }

    /**
     * Get all available applications
     */
    @Transactional(readOnly = true)
    public List<NuApplication> getAllApplications() {
        return applicationRepository.findAllAvailable();
    }

    /**
     * Get applications available to current tenant
     */
    @Transactional(readOnly = true)
    public List<NuApplication> getTenantApplications() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return applicationRepository.findAvailableForTenant(tenantId);
    }

    /**
     * Get application by code
     */
    @Transactional(readOnly = true)
    public Optional<NuApplication> getApplication(String code) {
        return applicationRepository.findByCode(code.toUpperCase());
    }

    // ==================== Permission Registration ====================

    /**
     * Register permissions for an application.
     * Called during application startup to ensure all permissions exist.
     */
    public void registerPermissions(String appCode, List<PermissionDefinition> permissions) {
        NuApplication app = applicationRepository.findByCode(appCode.toUpperCase())
            .orElseThrow(() -> new IllegalArgumentException("Application not found: " + appCode));

        for (PermissionDefinition def : permissions) {
            String fullCode = AppPermission.buildCode(appCode.toUpperCase(), def.module(), def.action());

            if (!permissionRepository.existsByCode(fullCode)) {
                AppPermission permission = AppPermission.builder()
                    .application(app)
                    .code(fullCode)
                    .module(def.module())
                    .action(def.action())
                    .name(def.name())
                    .description(def.description())
                    .category(def.category())
                    .isSystemPermission(def.isSystem())
                    .displayOrder(def.order())
                    .build();

                permissionRepository.save(permission);
                log.debug("Registered permission: {}", fullCode);
            }
        }

        log.info("Registered {} permissions for application: {}", permissions.size(), appCode);
    }

    /**
     * Get all permissions for an application
     */
    @Transactional(readOnly = true)
    public List<AppPermission> getApplicationPermissions(String appCode) {
        return permissionRepository.findByApplicationCode(appCode.toUpperCase());
    }

    /**
     * Get permissions grouped by module
     */
    @Transactional(readOnly = true)
    public Map<String, List<AppPermission>> getPermissionsByModule(String appCode) {
        List<AppPermission> permissions = getApplicationPermissions(appCode);
        return permissions.stream()
            .collect(Collectors.groupingBy(AppPermission::getModule));
    }

    // ==================== Role Management ====================

    /**
     * Create a role for an application
     */
    public AppRole createRole(String appCode, String roleCode, String name, String description,
                              int level, Set<String> permissionCodes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        NuApplication app = applicationRepository.findByCode(appCode.toUpperCase())
            .orElseThrow(() -> new IllegalArgumentException("Application not found: " + appCode));

        if (roleRepository.existsByCodeAndTenantIdAndApplicationId(roleCode, tenantId, app.getId())) {
            throw new IllegalArgumentException("Role already exists: " + roleCode);
        }

        AppRole role = AppRole.builder()
            .application(app)
            .code(roleCode)
            .name(name)
            .description(description)
            .level(level)
            .isSystemRole(false)
            .isDefaultRole(false)
            .build();
        role.setTenantId(tenantId);

        // Add permissions
        if (permissionCodes != null && !permissionCodes.isEmpty()) {
            List<AppPermission> permissions = permissionRepository.findByCodeIn(permissionCodes);
            for (AppPermission perm : permissions) {
                if (perm.getApplication().getId().equals(app.getId())) {
                    role.getPermissions().add(perm);
                }
            }
        }

        role = roleRepository.save(role);
        log.info("Created role {} for application {} in tenant {}", roleCode, appCode, tenantId);
        return role;
    }

    /**
     * Get all roles for an application in current tenant
     */
    @Transactional(readOnly = true)
    public List<AppRole> getApplicationRoles(String appCode) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return roleRepository.findByTenantIdAndApplicationCode(tenantId, appCode.toUpperCase());
    }

    /**
     * Get a role by ID
     */
    @Transactional(readOnly = true)
    public Optional<AppRole> getRoleById(UUID roleId) {
        return roleRepository.findById(roleId);
    }

    /**
     * Update role permissions
     */
    public AppRole updateRolePermissions(UUID roleId, Set<String> permissionCodes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        AppRole role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        if (role.getIsSystemRole()) {
            throw new IllegalStateException("Cannot modify system role");
        }

        role.getPermissions().clear();

        if (permissionCodes != null && !permissionCodes.isEmpty()) {
            List<AppPermission> permissions = permissionRepository.findByCodeIn(permissionCodes);
            for (AppPermission perm : permissions) {
                if (perm.getApplication().getId().equals(role.getApplication().getId())) {
                    role.getPermissions().add(perm);
                }
            }
        }

        return roleRepository.save(role);
    }

    // ==================== User Access Management ====================

    /**
     * Grant user access to an application with roles
     */
    public UserAppAccess grantAccess(UUID userId, String appCode, Set<String> roleCodes, UUID grantedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        NuApplication app = applicationRepository.findByCode(appCode.toUpperCase())
            .orElseThrow(() -> new IllegalArgumentException("Application not found: " + appCode));

        // Check if user already has access
        Optional<UserAppAccess> existing = userAppAccessRepository.findByUserIdAndApplicationId(userId, app.getId());
        if (existing.isPresent()) {
            // Update existing access
            UserAppAccess access = existing.get();
            access.setStatus(UserAppAccess.AccessStatus.ACTIVE);
            updateAccessRoles(access, roleCodes);
            return userAppAccessRepository.save(access);
        }

        // Create new access
        UserAppAccess access = UserAppAccess.builder()
            .user(user)
            .application(app)
            .status(UserAppAccess.AccessStatus.ACTIVE)
            .grantedAt(LocalDateTime.now())
            .grantedBy(grantedBy)
            .build();
        access.setTenantId(tenantId);

        // Add roles
        updateAccessRoles(access, roleCodes);

        access = userAppAccessRepository.save(access);
        log.info("Granted access to app {} for user {} with roles {}", appCode, userId, roleCodes);
        return access;
    }

    private void updateAccessRoles(UserAppAccess access, Set<String> roleCodes) {
        access.getRoles().clear();

        if (roleCodes != null && !roleCodes.isEmpty()) {
            for (String roleCode : roleCodes) {
                roleRepository.findByCodeAndTenantIdAndApplicationId(
                    roleCode, access.getTenantId(), access.getApplication().getId()
                ).ifPresent(access::addRole);
            }
        }

        // If no roles assigned, assign default role
        if (access.getRoles().isEmpty()) {
            roleRepository.findByTenantIdAndApplicationIdAndIsDefaultRoleTrue(
                access.getTenantId(), access.getApplication().getId()
            ).ifPresent(access::addRole);
        }
    }

    /**
     * Revoke user access to an application
     */
    public void revokeAccess(UUID userId, String appCode) {
        NuApplication app = applicationRepository.findByCode(appCode.toUpperCase())
            .orElseThrow(() -> new IllegalArgumentException("Application not found: " + appCode));

        UserAppAccess access = userAppAccessRepository.findByUserIdAndApplicationId(userId, app.getId())
            .orElseThrow(() -> new IllegalArgumentException("User does not have access to this application"));

        access.setStatus(UserAppAccess.AccessStatus.REVOKED);
        userAppAccessRepository.save(access);
        log.info("Revoked access to app {} for user {}", appCode, userId);
    }

    /**
     * Get all active users with access to an application
     *
     * @param appCode the application code
     * @return list of user app access records, or empty list if application not found
     */
    @Transactional(readOnly = true)
    public List<UserAppAccess> getApplicationUsers(String appCode) {
        Optional<NuApplication> appOpt = applicationRepository.findByCode(appCode.toUpperCase());
        if (appOpt.isEmpty()) {
            return Collections.emptyList();
        }
        return userAppAccessRepository.findByApplicationIdAndStatus(
            appOpt.get().getId(), UserAppAccess.AccessStatus.ACTIVE);
    }

    /**
     * Get user's accessible applications
     */
    @Transactional(readOnly = true)
    public List<UserAppAccess> getUserApplications(UUID userId) {
        return userAppAccessRepository.findUserApplications(userId);
    }

    /**
     * Get user's access details for an application (used during authentication)
     */
    @Transactional(readOnly = true)
    public Optional<UserAppAccess> getUserAppAccess(UUID userId, String appCode) {
        return userAppAccessRepository.findByUserIdAndAppCodeWithPermissions(userId, appCode.toUpperCase());
    }

    /**
     * Get all permissions for a user in an application
     */
    @Transactional(readOnly = true)
    public Set<String> getUserPermissions(UUID userId, String appCode) {
        return userAppAccessRepository.findByUserIdAndAppCodeWithPermissions(userId, appCode.toUpperCase())
            .map(UserAppAccess::getAllPermissions)
            .orElse(Collections.emptySet());
    }

    /**
     * Check if user has a specific permission in an application
     */
    @Transactional(readOnly = true)
    public boolean hasPermission(UUID userId, String appCode, String permissionCode) {
        return getUserPermissions(userId, appCode).contains(permissionCode);
    }

    /**
     * Check if user has access to an application
     */
    @Transactional(readOnly = true)
    public boolean hasAccess(UUID userId, String appCode) {
        return userAppAccessRepository.hasActiveAccess(userId, appCode.toUpperCase());
    }

    // ==================== Tenant Subscription Management ====================

    /**
     * Enable an application for a tenant
     */
    public TenantApplication enableApplicationForTenant(UUID tenantId, String appCode,
                                                        String tier, Integer maxUsers) {
        NuApplication app = applicationRepository.findByCode(appCode.toUpperCase())
            .orElseThrow(() -> new IllegalArgumentException("Application not found: " + appCode));

        Optional<TenantApplication> existing = tenantApplicationRepository
            .findByTenantIdAndApplicationId(tenantId, app.getId());

        if (existing.isPresent()) {
            TenantApplication ta = existing.get();
            ta.setStatus(TenantApplication.SubscriptionStatus.ACTIVE);
            ta.setSubscriptionTier(tier);
            ta.setMaxUsers(maxUsers);
            return tenantApplicationRepository.save(ta);
        }

        TenantApplication ta = TenantApplication.builder()
            .application(app)
            .status(TenantApplication.SubscriptionStatus.ACTIVE)
            .activatedAt(LocalDateTime.now())
            .subscriptionTier(tier)
            .maxUsers(maxUsers)
            .build();
        ta.setTenantId(tenantId);

        return tenantApplicationRepository.save(ta);
    }

    /**
     * Check if tenant has access to an application
     */
    @Transactional(readOnly = true)
    public boolean tenantHasApplication(UUID tenantId, String appCode) {
        return tenantApplicationRepository.hasActiveSubscription(tenantId, appCode.toUpperCase());
    }

    // ==================== Permission Definition Helper ====================

    public record PermissionDefinition(
        String module,
        String action,
        String name,
        String description,
        String category,
        boolean isSystem,
        int order
    ) {
        public static PermissionDefinition of(String module, String action, String name) {
            return new PermissionDefinition(module, action, name, null, null, false, 0);
        }

        public static PermissionDefinition of(String module, String action, String name, String description) {
            return new PermissionDefinition(module, action, name, description, null, false, 0);
        }

        public static PermissionDefinition of(String module, String action, String name,
                                              String description, String category) {
            return new PermissionDefinition(module, action, name, description, category, false, 0);
        }
    }
}
