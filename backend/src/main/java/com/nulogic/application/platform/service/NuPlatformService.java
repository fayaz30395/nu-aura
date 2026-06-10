package com.nulogic.application.platform.service;

import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.platform.*;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.platform.repository.*;
import com.nulogic.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /**
     * SEC (3a): privileged role codes that may only be granted through the platform
     * app-access path by a SuperAdmin. App-access role codes flow directly into the
     * session's role set (AuthService.loadAppRolesFromAccess), so granting
     * SUPER_ADMIN here is equivalent to assigning the SUPER_ADMIN role itself —
     * it must carry the same escalation guard as RoleManagementService/AdminService.
     */
    private static final Set<String> PRIVILEGED_ROLE_CODES = Set.of(
            com.nulogic.common.security.RoleHierarchy.SUPER_ADMIN
    );

    private final NuApplicationRepository applicationRepository;
    private final AppPermissionRepository permissionRepository;
    private final AppRoleRepository roleRepository;
    private final UserAppAccessRepository userAppAccessRepository;
    private final TenantApplicationRepository tenantApplicationRepository;
    private final UserRepository userRepository;
    private final TenantTimeService tenantTimeService;

    /**
     * SEC (3a): privilege-escalation guard for app-access role grants.
     * A non-SuperAdmin caller (e.g. a TenantAdmin holding USER:MANAGE) must not be
     * able to grant SUPER_ADMIN — or any privileged role — via the platform
     * access-grant endpoints. SuperAdmin bypasses all checks by design.
     */
    private void validateNoPrivilegedAppRoleGrant(Set<String> roleCodes) {
        if (roleCodes == null || roleCodes.isEmpty() || SecurityContext.isSuperAdmin()) {
            return;
        }
        Set<String> privilegedRequested = roleCodes.stream()
                .filter(PRIVILEGED_ROLE_CODES::contains)
                .collect(Collectors.toSet());
        if (!privilegedRequested.isEmpty()) {
            log.warn("SECURITY: Privilege escalation attempt — user {} tried to grant privileged app roles {} via app access",
                    SecurityContext.getCurrentUserId(), privilegedRequested);
            throw new AccessDeniedException(
                    "Only SuperAdmin can grant privileged roles via app access: " + privilegedRequested);
        }
    }

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

        // Batch: fetch all existing permission codes in ONE query instead of N individual existsByCode calls
        Set<String> allCodes = permissions.stream()
                .map(def -> AppPermission.buildCode(appCode.toUpperCase(), def.module(), def.action()))
                .collect(Collectors.toSet());
        Set<String> existingCodes = permissionRepository.findByCodeIn(allCodes).stream()
                .map(AppPermission::getCode)
                .collect(Collectors.toSet());

        List<AppPermission> newPermissions = new java.util.ArrayList<>();
        for (PermissionDefinition def : permissions) {
            String fullCode = AppPermission.buildCode(appCode.toUpperCase(), def.module(), def.action());

            if (!existingCodes.contains(fullCode)) {
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

                newPermissions.add(permission);
                log.debug("Registered permission: {}", fullCode);
            }
        }

        if (!newPermissions.isEmpty()) {
            permissionRepository.saveAll(newPermissions);
        }

        log.info("Registered {} permissions for application: {} ({} new)",
                permissions.size(), appCode, newPermissions.size());
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
    @Transactional
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
     * Get all roles for an application in current tenant.
     * Always scoped to current tenant — never returns cross-tenant roles (RECHECK-PLAT-003).
     */
    @Transactional(readOnly = true)
    public List<AppRole> getApplicationRoles(String appCode) {
        UUID tenantId = TenantContext.getCurrentTenant();
        // Explicitly tenant-scoped: roleRepository.findAll() is never used here
        return roleRepository.findByTenantIdAndApplicationCode(tenantId, appCode.toUpperCase());
    }

    /**
     * Get a role by ID — scoped to current tenant (RECHECK-PLAT-001)
     */
    @Transactional(readOnly = true)
    public Optional<AppRole> getRoleById(UUID roleId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return roleRepository.findById(roleId)
                .filter(r -> r.getTenantId().equals(tenantId));
    }

    /**
     * Update role permissions
     */
    @Transactional
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
     * Grant user access to an application with roles.
     * Validates that the target user belongs to the caller's tenant (RECHECK-PLAT-002).
     */
    public UserAppAccess grantAccess(UUID userId, String appCode, Set<String> roleCodes, UUID grantedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // SEC (3a): block non-SuperAdmin callers from granting SUPER_ADMIN (or any
        // privileged role) through the app-access path — these role codes are loaded
        // into the user's session roles at login and would be a full RBAC bypass.
        validateNoPrivilegedAppRoleGrant(roleCodes);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!user.getTenantId().equals(tenantId)) {
            throw new AccessDeniedException("Cannot grant access to users from a different tenant");
        }

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
                .grantedAt(tenantTimeService.now(tenantId))
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
     * Revoke user access to an application.
     * Emits an audit log entry after the revoke completes (RECHECK-PLAT-004).
     */
    @Transactional
    public void revokeAccess(UUID userId, String appCode) {
        UUID tenantId = TenantContext.getCurrentTenant();

        NuApplication app = applicationRepository.findByCode(appCode.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + appCode));

        UserAppAccess access = userAppAccessRepository.findByUserIdAndApplicationId(userId, app.getId())
                .orElseThrow(() -> new IllegalArgumentException("User does not have access to this application"));

        access.setStatus(UserAppAccess.AccessStatus.REVOKED);
        userAppAccessRepository.save(access);

        UUID revokedBy = SecurityContext.getCurrentUserId();
        log.info("Access revoked: userId={} appCode={} tenantId={} revokedBy={}",
                userId, appCode, tenantId, revokedBy);
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
                .activatedAt(tenantTimeService.now(tenantId))
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
