package com.hrms.common.security;

import com.hrms.domain.user.RoleScope;
import org.springframework.stereotype.Component;
import java.util.*;

/**
 * Security context holder for current user in the NU Platform.
 * Supports multi-application permissions with app-prefixed permission codes.
 *
 * Permission format: {APP_CODE}:{MODULE}:{ACTION}
 * Example: HRMS:EMPLOYEE:READ, CRM:CONTACT:CREATE
 */
@Component
public class SecurityContext {

    private static final ThreadLocal<UUID> currentUserId = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentEmployeeId = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentTenantId = new ThreadLocal<>();
    private static final ThreadLocal<String> currentAppCode = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> currentRoles = new ThreadLocal<>();
    // Store permissions with their max scope (e.g. "EMPLOYEE:READ" -> "GLOBAL")
    private static final ThreadLocal<Map<String, RoleScope>> currentPermissions = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentDepartmentId = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentTeamId = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentLocationId = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> accessibleApps = new ThreadLocal<>();

    /**
     * Set current user context (called during authentication)
     */
    public static void setCurrentUser(UUID userId, UUID employeeId, Set<String> roles,
            Map<String, RoleScope> permissions) {
        currentUserId.set(userId);
        currentEmployeeId.set(employeeId);
        currentRoles.set(roles != null ? roles : Collections.emptySet());
        currentPermissions.set(permissions != null ? permissions : Collections.emptyMap());
    }

    /**
     * Set the current application context
     */
    public static void setCurrentApp(String appCode) {
        currentAppCode.set(appCode);
    }

    /**
     * Set applications the user has access to
     */
    public static void setAccessibleApps(Set<String> apps) {
        accessibleApps.set(apps != null ? apps : Collections.emptySet());
    }

    public static void setCurrentTenantId(UUID tenantId) {
        currentTenantId.set(tenantId);
    }

    public static void setOrgContext(UUID locationId, UUID departmentId, UUID teamId) {
        currentLocationId.set(locationId);
        currentDepartmentId.set(departmentId);
        currentTeamId.set(teamId);
    }

    // ==================== Getters ====================

    public static UUID getCurrentUserId() {
        return currentUserId.get();
    }

    public static UUID getCurrentEmployeeId() {
        return currentEmployeeId.get();
    }

    public static UUID getCurrentTenantId() {
        return currentTenantId.get();
    }

    public static String getCurrentAppCode() {
        return currentAppCode.get();
    }

    public static Set<String> getCurrentRoles() {
        return currentRoles.get() != null ? currentRoles.get() : Collections.emptySet();
    }

    public static Set<String> getCurrentPermissions() {
        return currentPermissions.get() != null ? currentPermissions.get().keySet() : Collections.emptySet();
    }

    public static RoleScope getPermissionScope(String permission) {
        Map<String, RoleScope> map = currentPermissions.get();
        if (map == null)
            return null;

        // Direct match
        if (map.containsKey(permission))
            return map.get(permission);

        // App prefixed match (if simple name passed)
        String appCode = getCurrentAppCode();
        if (appCode != null && !permission.startsWith(appCode + ":")) {
            String fullPerm = appCode + ":" + permission;
            if (map.containsKey(fullPerm))
                return map.get(fullPerm);
        }

        return null; // No permission, so no scope
    }

    public static UUID getCurrentDepartmentId() {
        return currentDepartmentId.get();
    }

    public static UUID getCurrentTeamId() {
        return currentTeamId.get();
    }

    public static UUID getCurrentLocationId() {
        return currentLocationId.get();
    }

    public static Set<String> getAccessibleApps() {
        return accessibleApps.get() != null ? accessibleApps.get() : Collections.emptySet();
    }

    // ==================== Permission Checks ====================

    /**
     * Check if user has a specific permission.
     * Supports both new format (HRMS:EMPLOYEE:READ) and legacy format
     * (EMPLOYEE:READ).
     * Also checks for system admin permission.
     */
    public static boolean hasPermission(String permission) {
        Set<String> permissions = getCurrentPermissions();

        // Check for system admin (bypasses all)
        String appCode = getCurrentAppCode();
        if (appCode != null && permissions.contains(appCode + ":SYSTEM:ADMIN")) {
            return true;
        }

        // Also check legacy system admin
        if (permissions.contains(Permission.SYSTEM_ADMIN)) {
            return true;
        }

        // Direct permission check
        if (permissions.contains(permission)) {
            return true;
        }

        // If permission doesn't have app prefix, try adding current app prefix
        if (appCode != null && !permission.startsWith(appCode + ":")) {
            return permissions.contains(appCode + ":" + permission);
        }

        return false;
    }

    /**
     * Check if user has permission in a specific application
     */
    public static boolean hasPermissionInApp(String appCode, String module, String action) {
        String fullPermission = appCode + ":" + module + ":" + action;
        return getCurrentPermissions().contains(fullPermission) ||
                getCurrentPermissions().contains(appCode + ":SYSTEM:ADMIN");
    }

    /**
     * Check if user has any of the given permissions
     */
    public static boolean hasAnyPermission(String... permissions) {
        for (String permission : permissions) {
            if (hasPermission(permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all of the given permissions
     */
    public static boolean hasAllPermissions(String... permissions) {
        for (String permission : permissions) {
            if (!hasPermission(permission)) {
                return false;
            }
        }
        return true;
    }

    // ==================== Role Checks ====================

    /**
     * Check if user has a specific role in the current application
     */
    public static boolean hasRole(String role) {
        return getCurrentRoles().contains(role);
    }

    /**
     * Check if user has any of the given roles
     */
    public static boolean hasAnyRole(String... roles) {
        Set<String> userRoles = getCurrentRoles();
        for (String role : roles) {
            if (userRoles.contains(role)) {
                return true;
            }
        }
        return false;
    }

    // ==================== App Access Checks ====================

    /**
     * Check if user has access to an application
     */
    public static boolean hasAppAccess(String appCode) {
        return getAccessibleApps().contains(appCode);
    }

    /**
     * Check if user is system admin for current app
     */
    public static boolean isSystemAdmin() {
        String appCode = getCurrentAppCode();
        if (appCode != null) {
            return hasPermission(appCode + ":SYSTEM:ADMIN");
        }
        return hasPermission(Permission.SYSTEM_ADMIN);
    }

    /**
     * Legacy role checks - kept for backward compatibility
     */
    public static boolean isSuperAdmin() {
        return hasRole(RoleHierarchy.SUPER_ADMIN) || isSystemAdmin();
    }

    public static boolean isTenantAdmin() {
        return hasRole(RoleHierarchy.TENANT_ADMIN) || isSuperAdmin();
    }

    public static boolean isHRManager() {
        return hasRole(RoleHierarchy.HR_MANAGER) || isTenantAdmin();
    }

    public static boolean isManager() {
        return hasAnyRole(
                RoleHierarchy.HR_MANAGER,
                RoleHierarchy.DEPARTMENT_MANAGER,
                RoleHierarchy.TEAM_LEAD) || isTenantAdmin();
    }

    // ==================== Permission Extraction ====================

    /**
     * Get permissions for a specific module in current app
     */
    public static Set<String> getModulePermissions(String module) {
        String appCode = getCurrentAppCode();
        String prefix = (appCode != null ? appCode + ":" : "") + module + ":";

        Set<String> modulePerms = new HashSet<>();
        for (String perm : getCurrentPermissions()) {
            if (perm.startsWith(prefix)) {
                modulePerms.add(perm);
            }
        }
        return modulePerms;
    }

    /**
     * Get all permissions for a specific application
     */
    public static Set<String> getAppPermissions(String appCode) {
        String prefix = appCode + ":";
        Set<String> appPerms = new HashSet<>();
        for (String perm : getCurrentPermissions()) {
            if (perm.startsWith(prefix)) {
                appPerms.add(perm);
            }
        }
        return appPerms;
    }

    // ==================== Clear Context ====================

    public static void clear() {
        currentUserId.remove();
        currentEmployeeId.remove();
        currentTenantId.remove();
        currentAppCode.remove();
        currentRoles.remove();
        currentPermissions.remove();
        currentDepartmentId.remove();
        currentTeamId.remove();
        currentLocationId.remove();
        accessibleApps.remove();
    }
}
