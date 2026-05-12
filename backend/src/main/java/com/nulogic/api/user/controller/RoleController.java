package com.nulogic.api.user.controller;

import com.nulogic.api.user.dto.*;
import com.nulogic.application.user.service.RoleManagementService;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.UUID;

import static com.nulogic.common.security.Permission.ROLE_MANAGE;
import static com.nulogic.common.security.Permission.ROLE_READ;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleManagementService roleManagementService;

    @GetMapping
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<Page<RoleResponse>> getAllRoles(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<RoleResponse> roles = roleManagementService.getAllRoles(pageable);
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/{id}")
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<RoleResponse> getRoleById(@PathVariable UUID id) {
        RoleResponse role = roleManagementService.getRoleById(id);
        return ResponseEntity.ok(role);
    }

    @PostMapping
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<RoleResponse> createRole(@Valid @RequestBody CreateRoleRequest request) {
        RoleResponse role = roleManagementService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(role);
    }

    @PutMapping("/{id}")
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<RoleResponse> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request) {
        RoleResponse role = roleManagementService.updateRole(id, request);
        return ResponseEntity.ok(role);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<Void> deleteRole(@PathVariable UUID id) {
        roleManagementService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/permissions")
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<RoleResponse> assignPermissions(
            @PathVariable UUID id,
            @Valid @RequestBody AssignPermissionsRequest request) {
        RoleResponse role = roleManagementService.assignPermissions(id, request);
        return ResponseEntity.ok(role);
    }

    @PostMapping("/{id}/permissions")
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<RoleResponse> addPermissions(
            @PathVariable UUID id,
            @Valid @RequestBody AssignPermissionsRequest request) {
        RoleResponse role = roleManagementService.addPermissions(id, request);
        return ResponseEntity.ok(role);
    }

    @DeleteMapping("/{id}/permissions")
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<RoleResponse> removePermissions(
            @PathVariable UUID id,
            @Valid @RequestBody AssignPermissionsRequest request) {
        RoleResponse role = roleManagementService.removePermissions(id, request);
        return ResponseEntity.ok(role);
    }

    /**
     * Assign permissions with specific scopes to a role (Keka-style RBAC).
     * Supports ALL, LOCATION, DEPARTMENT, TEAM, SELF, and CUSTOM scopes.
     */
    @PutMapping("/{id}/permissions-with-scope")
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<RoleResponse> assignPermissionsWithScope(
            @PathVariable UUID id,
            @Valid @RequestBody AssignPermissionsWithScopeRequest request) {
        RoleResponse role = roleManagementService.assignPermissionsWithScope(id, request);
        return ResponseEntity.ok(role);
    }

    /**
     * Update scope for a single permission on a role.
     */
    @PatchMapping("/{roleId}/permissions/{permissionCode}/scope")
    @RequiresPermission(value = ROLE_MANAGE, revalidate = true)
    public ResponseEntity<RoleResponse> updatePermissionScope(
            @PathVariable UUID roleId,
            @PathVariable String permissionCode,
            @Valid @RequestBody UpdatePermissionScopeRequest request) {
        RoleResponse role = roleManagementService.updatePermissionScope(
                roleId, permissionCode, request.getScope(), request.getCustomTargets());
        return ResponseEntity.ok(role);
    }

    @GetMapping("/{id}/effective-permissions")
    @RequiresPermission(ROLE_READ)
    public ResponseEntity<Set<PermissionResponse>> getEffectivePermissions(@PathVariable UUID id) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Set<PermissionResponse> permissions = roleManagementService.getEffectivePermissions(id, tenantId);
        return ResponseEntity.ok(permissions);
    }
}
