package com.hrms.api.platform.controller;

import com.hrms.api.platform.dto.*;
import com.hrms.application.platform.service.NuPlatformService;
import com.hrms.application.platform.service.PermissionMigrationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.platform.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * REST API for NU Platform management.
 * Handles applications, roles, permissions, and user access.
 */
@RestController
@RequestMapping("/api/v1/platform")
@RequiredArgsConstructor
@Slf4j
public class PlatformController {

    private final NuPlatformService platformService;
    private final PermissionMigrationService migrationService;

    // ==================== Applications ====================

    /**
     * Get all available applications
     */
    @GetMapping("/applications")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<List<ApplicationDTO>> getAllApplications() {
        List<NuApplication> apps = platformService.getAllApplications();
        List<ApplicationDTO> dtos = apps.stream()
                .map(ApplicationDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get applications available to current tenant
     */
    @GetMapping("/applications/tenant")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<List<ApplicationDTO>> getTenantApplications() {
        List<NuApplication> apps = platformService.getTenantApplications();
        List<ApplicationDTO> dtos = apps.stream()
                .map(ApplicationDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get application by code
     */
    @GetMapping("/applications/{code}")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<ApplicationDTO> getApplication(@PathVariable String code) {
        return platformService.getApplication(code)
                .map(ApplicationDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get current user's accessible applications (for app switcher)
     */
    @GetMapping("/my-applications")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<List<UserAppAccessDTO>> getMyApplications() {
        UUID userId = SecurityContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }

        List<UserAppAccess> accessList = platformService.getUserApplications(userId);
        List<UserAppAccessDTO> dtos = accessList.stream()
                .map(UserAppAccessDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ==================== Permissions ====================

    /**
     * Get all permissions for an application
     */
    @GetMapping("/applications/{appCode}/permissions")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<List<AppPermissionDTO>> getApplicationPermissions(@PathVariable String appCode) {
        List<AppPermission> permissions = platformService.getApplicationPermissions(appCode);
        List<AppPermissionDTO> dtos = permissions.stream()
                .map(AppPermissionDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get permissions grouped by module
     */
    @GetMapping("/applications/{appCode}/permissions/by-module")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<Map<String, List<AppPermissionDTO>>> getPermissionsByModule(@PathVariable String appCode) {
        Map<String, List<AppPermission>> permissionsByModule = platformService.getPermissionsByModule(appCode);
        Map<String, List<AppPermissionDTO>> result = new LinkedHashMap<>();

        permissionsByModule.forEach((module, perms) -> {
            result.put(module, perms.stream()
                    .map(AppPermissionDTO::fromEntity)
                    .collect(Collectors.toList()));
        });

        return ResponseEntity.ok(result);
    }

    /**
     * Get permissions grouped by category
     */
    @GetMapping("/applications/{appCode}/permissions/by-category")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<Map<String, List<AppPermissionDTO>>> getPermissionsByCategory(@PathVariable String appCode) {
        List<AppPermission> permissions = platformService.getApplicationPermissions(appCode);

        Map<String, List<AppPermissionDTO>> result = permissions.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getCategory() != null ? p.getCategory() : "Other",
                        LinkedHashMap::new,
                        Collectors.mapping(AppPermissionDTO::fromEntity, Collectors.toList())));

        return ResponseEntity.ok(result);
    }

    // ==================== Roles ====================

    /**
     * Get all roles for an application in current tenant
     */
    @GetMapping("/applications/{appCode}/roles")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<List<AppRoleDTO>> getApplicationRoles(@PathVariable String appCode) {
        List<AppRole> roles = platformService.getApplicationRoles(appCode);
        List<AppRoleDTO> dtos = roles.stream()
                .map(AppRoleDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get role by ID
     */
    @GetMapping("/roles/{roleId}")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<AppRoleDTO> getRole(@PathVariable UUID roleId) {
        return platformService.getRoleById(roleId)
                .map(AppRoleDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new role
     */
    @PostMapping("/roles")
    @RequiresPermission("ROLE:MANAGE")
    public ResponseEntity<AppRoleDTO> createRole(@Valid @RequestBody CreateRoleRequest request) {
        AppRole role = platformService.createRole(
                request.getAppCode(),
                request.getRoleCode(),
                request.getName(),
                request.getDescription(),
                request.getLevel(),
                request.getPermissionCodes());
        return ResponseEntity.ok(AppRoleDTO.fromEntity(role));
    }

    /**
     * Update role permissions
     */
    @PutMapping("/roles/{roleId}/permissions")
    @RequiresPermission("ROLE:MANAGE")
    public ResponseEntity<AppRoleDTO> updateRolePermissions(
            @PathVariable UUID roleId,
            @Valid @RequestBody Set<String> permissionCodes) {
        AppRole role = platformService.updateRolePermissions(roleId, permissionCodes);
        return ResponseEntity.ok(AppRoleDTO.fromEntity(role));
    }

    // ==================== User Access ====================

    /**
     * Get all users with access to an application
     */
    @GetMapping("/applications/{appCode}/users")
    @RequiresPermission("USER:READ")
    public ResponseEntity<List<UserAppAccessDTO>> getApplicationUsers(@PathVariable String appCode) {
        List<UserAppAccess> accessList = platformService.getApplicationUsers(appCode);

        List<UserAppAccessDTO> dtos = accessList.stream()
                .map(UserAppAccessDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get user's access details for an application
     */
    @GetMapping("/users/{userId}/access/{appCode}")
    @RequiresPermission("USER:READ")
    public ResponseEntity<UserAppAccessDTO> getUserAppAccess(
            @PathVariable UUID userId,
            @PathVariable String appCode) {
        return platformService.getUserAppAccess(userId, appCode)
                .map(UserAppAccessDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all applications a user has access to
     */
    @GetMapping("/users/{userId}/applications")
    @RequiresPermission("USER:READ")
    public ResponseEntity<List<UserAppAccessDTO>> getUserApplications(@PathVariable UUID userId) {
        List<UserAppAccess> accessList = platformService.getUserApplications(userId);
        List<UserAppAccessDTO> dtos = accessList.stream()
                .map(UserAppAccessDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Grant user access to an application
     */
    @PostMapping("/access/grant")
    @RequiresPermission("USER:MANAGE")
    public ResponseEntity<UserAppAccessDTO> grantAccess(@Valid @RequestBody GrantAccessRequest request) {
        UUID grantedBy = SecurityContext.getCurrentUserId();
        UserAppAccess access = platformService.grantAccess(
                request.getUserId(),
                request.getAppCode(),
                request.getRoleCodes(),
                grantedBy);
        return ResponseEntity.ok(UserAppAccessDTO.fromEntity(access));
    }

    /**
     * Revoke user access to an application
     */
    @PostMapping("/access/revoke")
    @RequiresPermission("USER:MANAGE")
    public ResponseEntity<Void> revokeAccess(
            @RequestParam UUID userId,
            @RequestParam String appCode) {
        platformService.revokeAccess(userId, appCode);
        return ResponseEntity.ok().build();
    }

    /**
     * Update user's roles in an application
     */
    @PutMapping("/users/{userId}/access/{appCode}/roles")
    @RequiresPermission("USER:MANAGE")
    public ResponseEntity<UserAppAccessDTO> updateUserRoles(
            @PathVariable UUID userId,
            @PathVariable String appCode,
            @Valid @RequestBody Set<String> roleCodes) {
        UUID grantedBy = SecurityContext.getCurrentUserId();
        UserAppAccess access = platformService.grantAccess(userId, appCode, roleCodes, grantedBy);
        return ResponseEntity.ok(UserAppAccessDTO.fromEntity(access));
    }

    // ==================== Permission Checks ====================

    /**
     * Check if current user has a permission
     */
    @GetMapping("/check-permission")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<Map<String, Boolean>> checkPermission(@RequestParam String permission) {
        boolean hasPermission = SecurityContext.hasPermission(permission);
        return ResponseEntity.ok(Map.of("hasPermission", hasPermission));
    }

    /**
     * Check multiple permissions at once
     */
    @PostMapping("/check-permissions")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<Map<String, Boolean>> checkPermissions(@Valid @RequestBody List<String> permissions) {
        Map<String, Boolean> result = new LinkedHashMap<>();
        for (String perm : permissions) {
            result.put(perm, SecurityContext.hasPermission(perm));
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Get current user's permissions for an application
     */
    @GetMapping("/my-permissions/{appCode}")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<Set<String>> getMyPermissions(@PathVariable String appCode) {
        UUID userId = SecurityContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        Set<String> permissions = platformService.getUserPermissions(userId, appCode);
        return ResponseEntity.ok(permissions);
    }

    /**
     * Get current user's context info (for debugging/display)
     */
    @GetMapping("/my-context")
    @RequiresPermission(Permission.PLATFORM_VIEW)
    public ResponseEntity<Map<String, Object>> getMyContext() {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("userId", SecurityContext.getCurrentUserId());
        context.put("employeeId", SecurityContext.getCurrentEmployeeId());
        context.put("tenantId", SecurityContext.getCurrentTenantId());
        context.put("appCode", SecurityContext.getCurrentAppCode());
        context.put("roles", SecurityContext.getCurrentRoles());
        context.put("permissions", SecurityContext.getCurrentPermissions());
        context.put("accessibleApps", SecurityContext.getAccessibleApps());
        context.put("isSystemAdmin", SecurityContext.isSystemAdmin());
        return ResponseEntity.ok(context);
    }

    // ==================== Migration ====================

    /**
     * Run permission migration for current tenant.
     * Migrates legacy permissions, roles, and user access to the NU Platform
     * format.
     */
    @PostMapping("/migrate")
    @RequiresPermission("SYSTEM:ADMIN")
    public ResponseEntity<PermissionMigrationService.MigrationResult> runMigration() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            tenantId = SecurityContext.getCurrentTenantId();
        }
        if (tenantId == null) {
            return ResponseEntity.badRequest().build();
        }

        log.info("Running permission migration for tenant: {}", tenantId);
        PermissionMigrationService.MigrationResult result = migrationService.migrateForTenant(tenantId);
        return ResponseEntity.ok(result);
    }

    /**
     * Run permission migration for a specific tenant (Super Admin only).
     */
    @PostMapping("/migrate/{tenantId}")
    @RequiresPermission("SYSTEM:ADMIN")
    public ResponseEntity<PermissionMigrationService.MigrationResult> runMigrationForTenant(
            @PathVariable UUID tenantId) {
        log.info("Running permission migration for tenant: {}", tenantId);
        PermissionMigrationService.MigrationResult result = migrationService.migrateForTenant(tenantId);
        return ResponseEntity.ok(result);
    }
}
