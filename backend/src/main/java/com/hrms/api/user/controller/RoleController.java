package com.hrms.api.user.controller;

import com.hrms.api.user.dto.*;
import com.hrms.application.user.service.RoleManagementService;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.ROLE_MANAGE;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleManagementService roleManagementService;

    @GetMapping
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<List<RoleResponse>> getAllRoles() {
        List<RoleResponse> roles = roleManagementService.getAllRoles();
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/{id}")
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<RoleResponse> getRoleById(@PathVariable UUID id) {
        RoleResponse role = roleManagementService.getRoleById(id);
        return ResponseEntity.ok(role);
    }

    @PostMapping
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<RoleResponse> createRole(@Valid @RequestBody CreateRoleRequest request) {
        RoleResponse role = roleManagementService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(role);
    }

    @PutMapping("/{id}")
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<RoleResponse> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request) {
        RoleResponse role = roleManagementService.updateRole(id, request);
        return ResponseEntity.ok(role);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<Void> deleteRole(@PathVariable UUID id) {
        roleManagementService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/permissions")
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<RoleResponse> assignPermissions(
            @PathVariable UUID id,
            @Valid @RequestBody AssignPermissionsRequest request) {
        RoleResponse role = roleManagementService.assignPermissions(id, request);
        return ResponseEntity.ok(role);
    }

    @PostMapping("/{id}/permissions")
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<RoleResponse> addPermissions(
            @PathVariable UUID id,
            @Valid @RequestBody AssignPermissionsRequest request) {
        RoleResponse role = roleManagementService.addPermissions(id, request);
        return ResponseEntity.ok(role);
    }

    @DeleteMapping("/{id}/permissions")
    @RequiresPermission(ROLE_MANAGE)
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
    @RequiresPermission(ROLE_MANAGE)
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
    @RequiresPermission(ROLE_MANAGE)
    public ResponseEntity<RoleResponse> updatePermissionScope(
            @PathVariable UUID roleId,
            @PathVariable String permissionCode,
            @Valid @RequestBody UpdatePermissionScopeRequest request) {
        RoleResponse role = roleManagementService.updatePermissionScope(
                roleId, permissionCode, request.getScope(), request.getCustomTargets());
        return ResponseEntity.ok(role);
    }
}
