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
    // NOTE: Tenant ID is now delegated to TenantContext for single source of truth
    // The currentTenantId ThreadLocal is REMOVED to prevent dual-context bugs
    private static final ThreadLocal<String> currentAppCode = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> currentRoles = new ThreadLocal<>();
    // Store permissions with their max scope (e.g. "EMPLOYEE:READ" -> "GLOBAL")
    private static final ThreadLocal<Map<String, RoleScope>> currentPermissions = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentDepartmentId = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentTeamId = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentLocationId = new ThreadLocal<>();
    private static final ThreadLocal<Set<UUID>> currentLocationIds = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> accessibleApps = new ThreadLocal<>();
    // Direct + indirect reportees for TEAM scope
    private static final ThreadLocal<Set<UUID>> allReporteeIds = new ThreadLocal<>();
    // Custom scope targets per permission (permission -> target IDs by type)
    private static final ThreadLocal<Map<String, Set<UUID>>> customEmployeeIds = new ThreadLocal<>();
    private static final ThreadLocal<Map<String, Set<UUID>>> customDepartmentIds = new ThreadLocal<>();
    private static final ThreadLocal<Map<String, Set<UUID>>> customLocationIds = new ThreadLocal<>();

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

    /**
     * Set current tenant ID. Delegates to TenantContext for single source of truth.
     * @deprecated Use TenantContext.setCurrentTenant() directly
     */
    @Deprecated(forRemoval = true)
    public static void setCurrentTenantId(UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
    }

    public static void setOrgContext(UUID locationId, UUID departmentId, UUID teamId) {
        currentLocationId.set(locationId);
        currentDepartmentId.set(departmentId);
        currentTeamId.set(teamId);
    }

    /**
     * Set multiple location IDs for users with access to multiple locations
     */
    public static void setCurrentLocationIds(Set<UUID> locationIds) {
        currentLocationIds.set(locationIds != null ? locationIds : Collections.emptySet());
    }

    /**
     * Set all reportee IDs (direct + indirect) for TEAM scope filtering
     */
    public static void setAllReporteeIds(Set<UUID> reporteeIds) {
        allReporteeIds.set(reporteeIds != null ? reporteeIds : Collections.emptySet());
    }

    /**
     * Set custom scope targets for a specific permission
     */
    public static void setCustomScopeTargets(String permission,
                                              Set<UUID> employeeIds,
                                              Set<UUID> departmentIds,
                                              Set<UUID> locationIds) {
        if (customEmployeeIds.get() == null) {
            customEmployeeIds.set(new HashMap<>());
        }
        if (customDepartmentIds.get() == null) {
            customDepartmentIds.set(new HashMap<>());
        }
        if (customLocationIds.get() == null) {
            customLocationIds.set(new HashMap<>());
        }

        if (employeeIds != null && !employeeIds.isEmpty()) {
            customEmployeeIds.get().put(permission, employeeIds);
        }
        if (departmentIds != null && !departmentIds.isEmpty()) {
            customDepartmentIds.get().put(permission, departmentIds);
        }
        if (locationIds != null && !locationIds.isEmpty()) {
            customLocationIds.get().put(permission, locationIds);
        }
    }

    // ==================== Getters ====================

    public static UUID getCurrentUserId() {
        return currentUserId.get();
    }

    public static UUID getCurrentEmployeeId() {
        return currentEmployeeId.get();
    }

    /**
     * Get current tenant ID. Delegates to TenantContext for single source of truth.
     */
    public static UUID getCurrentTenantId() {
        return TenantContext.getCurrentTenant();
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

    /**
     * Get all location IDs the user has access to (for LOCATION scope with multiple locations)
     */
    public static Set<UUID> getCurrentLocationIds() {
        Set<UUID> ids = currentLocationIds.get();
        if (ids != null && !ids.isEmpty()) {
            return ids;
        }
        // Fallback to single location
        UUID singleLocation = getCurrentLocationId();
        if (singleLocation != null) {
            return Set.of(singleLocation);
        }
        return Collections.emptySet();
    }

    /**
     * Get all reportee IDs (direct + indirect) for TEAM scope filtering
     */
    public static Set<UUID> getAllReporteeIds() {
        return allReporteeIds.get() != null ? allReporteeIds.get() : Collections.emptySet();
    }

    /**
     * Get custom employee IDs for CUSTOM scope filtering
     */
    public static Set<UUID> getCustomEmployeeIds(String permission) {
        Map<String, Set<UUID>> map = customEmployeeIds.get();
        if (map == null) return Collections.emptySet();
        return map.getOrDefault(permission, Collections.emptySet());
    }

    /**
     * Get custom department IDs for CUSTOM scope filtering
     */
    public static Set<UUID> getCustomDepartmentIds(String permission) {
        Map<String, Set<UUID>> map = customDepartmentIds.get();
        if (map == null) return Collections.emptySet();
        return map.getOrDefault(permission, Collections.emptySet());
    }

    /**
     * Get custom location IDs for CUSTOM scope filtering
     */
    public static Set<UUID> getCustomLocationIds(String permission) {
        Map<String, Set<UUID>> map = customLocationIds.get();
        if (map == null) return Collections.emptySet();
        return map.getOrDefault(permission, Collections.emptySet());
    }

    public static Set<String> getAccessibleApps() {
        return accessibleApps.get() != null ? accessibleApps.get() : Collections.emptySet();
    }

    // ==================== Permission Checks ====================

    /**
     * Check if user has a specific permission.
     * Supports both new format (HRMS:EMPLOYEE:READ) and legacy format
     * (EMPLOYEE:READ) and DB format (employee.read).
     * Also checks for system admin permission and permission hierarchy.
     *
     * Permission hierarchy: MANAGE implies all actions (MARK, READ, VIEW_ALL, VIEW_TEAM, etc.)
     */
    public static boolean hasPermission(String permission) {
        if (permission == null) {
            return false;
        }
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

        // BUG-012 FIX: Normalize format for comparison — handle DB format (employee.read)
        // vs code format (EMPLOYEE:READ). The JwtAuthenticationFilter normalizes at load time,
        // but this provides a safety net for any code path that might bypass the filter.
        String normalizedPermission = permission.contains(".")
                ? permission.replace('.', ':').toUpperCase()
                : permission;
        if (!normalizedPermission.equals(permission) && permissions.contains(normalizedPermission)) {
            return true;
        }
        // Also try the reverse: if permission is UPPERCASE:COLON, check for lowercase.dot
        String dotFormat = permission.contains(":") && !permission.contains("SYSTEM")
                ? permission.replace(':', '.').toLowerCase()
                : null;
        if (dotFormat != null && permissions.contains(dotFormat)) {
            return true;
        }

        // If permission doesn't have app prefix, try adding current app prefix
        if (appCode != null && !permission.startsWith(appCode + ":")) {
            String fullPermission = appCode + ":" + permission;
            if (permissions.contains(fullPermission)) {
                return true;
            }
        }

        // Check permission hierarchy: MODULE:MANAGE implies MODULE:* (any action)
        // Extract module from permission (e.g., "ATTENDANCE:MARK" -> "ATTENDANCE")
        String module = extractModule(permission, appCode);
        if (module != null) {
            // Check if user has MANAGE permission for this module
            String managePermission = module + ":MANAGE";
            if (permissions.contains(managePermission)) {
                return true;
            }
            // Also check with app prefix
            if (appCode != null) {
                String fullManagePermission = appCode + ":" + module + ":MANAGE";
                if (permissions.contains(fullManagePermission)) {
                    return true;
                }
            }

            // Check if user has READ permission and requested action is VIEW_*
            if (permission.contains(":VIEW")) {
                String readPermission = module + ":READ";
                if (permissions.contains(readPermission)) {
                    return true;
                }
                if (appCode != null && permissions.contains(appCode + ":" + readPermission)) {
                    return true;
                }
            }

            // Permission scope hierarchy: VIEW_ALL > VIEW_TEAM > VIEW_DEPARTMENT > VIEW_SELF
            // A higher scope implies all lower scopes (e.g., VIEW_TEAM implies VIEW_SELF)
            if (permission.endsWith(":VIEW_SELF")) {
                for (String higherScope : new String[]{":VIEW_TEAM", ":VIEW_DEPARTMENT", ":VIEW_ALL"}) {
                    String higherPerm = module + higherScope;
                    if (permissions.contains(higherPerm)) {
                        return true;
                    }
                    if (appCode != null && permissions.contains(appCode + ":" + higherPerm)) {
                        return true;
                    }
                }
            } else if (permission.endsWith(":VIEW_DEPARTMENT")) {
                for (String higherScope : new String[]{":VIEW_TEAM", ":VIEW_ALL"}) {
                    String higherPerm = module + higherScope;
                    if (permissions.contains(higherPerm)) {
                        return true;
                    }
                    if (appCode != null && permissions.contains(appCode + ":" + higherPerm)) {
                        return true;
                    }
                }
            } else if (permission.endsWith(":VIEW_TEAM")) {
                String higherPerm = module + ":VIEW_ALL";
                if (permissions.contains(higherPerm)) {
                    return true;
                }
                if (appCode != null && permissions.contains(appCode + ":" + higherPerm)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Extract module name from a permission string.
     * E.g., "ATTENDANCE:MARK" -> "ATTENDANCE", "HRMS:ATTENDANCE:MARK" -> "ATTENDANCE"
     */
    private static String extractModule(String permission, String appCode) {
        if (permission == null) return null;

        String[] parts;
        // Remove app prefix if present
        if (appCode != null && permission.startsWith(appCode + ":")) {
            permission = permission.substring(appCode.length() + 1);
        }

        parts = permission.split(":");
        if (parts.length >= 2) {
            return parts[0]; // Return the module part
        }
        return null;
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
        // SuperAdmin role bypasses ALL permission checks (per CLAUDE.md).
        // Check both the SUPER_ADMIN role AND the SYSTEM:ADMIN permission
        // to handle cases where role-permission mapping is incomplete.
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
        // Note: TenantContext is cleared separately by filters (TenantFilter, JwtAuthenticationFilter)
        currentAppCode.remove();
        currentRoles.remove();
        currentPermissions.remove();
        currentDepartmentId.remove();
        currentTeamId.remove();
        currentLocationId.remove();
        currentLocationIds.remove();
        accessibleApps.remove();
        allReporteeIds.remove();
        customEmployeeIds.remove();
        customDepartmentIds.remove();
        customLocationIds.remove();
    }
}
