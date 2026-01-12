package com.hrms.application.user.service;

import com.hrms.api.user.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.domain.user.Permission;
import com.hrms.domain.user.Role;
import com.hrms.infrastructure.user.repository.PermissionRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoleManagementService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final com.hrms.infrastructure.user.repository.UserRepository userRepository;
    private final com.hrms.application.audit.service.AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<Role> roles = roleRepository.findByTenantIdWithPermissions(tenantId);
        return roles.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(UUID roleId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        return mapToResponse(role);
    }

    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        // Check if role code already exists for this tenant
        if (roleRepository.existsByCodeAndTenantId(request.getCode(), tenantId)) {
            throw new BusinessException("Role with code '" + request.getCode() + "' already exists");
        }

        // Create role - let JPA handle ID, version, and timestamps via auditing
        Role role = new Role();
        role.setCode(request.getCode());
        role.setName(request.getName());
        role.setDescription(request.getDescription());
        role.setIsSystemRole(false);
        role.setTenantId(tenantId);

        // Assign permissions if provided
        if (request.getPermissionCodes() != null && !request.getPermissionCodes().isEmpty()) {
            List<Permission> permissions = permissionRepository.findByCodeIn(request.getPermissionCodes());

            // Validate all permission codes exist
            if (permissions.size() != request.getPermissionCodes().size()) {
                throw new ValidationException("One or more permission codes are invalid");
            }

            for (Permission perm : permissions) {
                role.addPermission(perm, com.hrms.domain.user.RoleScope.GLOBAL);
            }
        }

        Role savedRole = roleRepository.save(role);
        log.info("Created role: {} for tenant: {}", savedRole.getCode(), tenantId);

        // Audit log
        auditLogService.logAction("ROLE", savedRole.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.CREATE,
                null, savedRole, "Created role: " + savedRole.getName());

        return mapToResponse(savedRole);
    }

    @Transactional
    public RoleResponse updateRole(UUID roleId, UpdateRoleRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        // Prevent updating system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException("Cannot update system role");
        }

        // Capture old values for audit
        String oldName = role.getName();
        String oldDescription = role.getDescription();

        // Update basic fields
        role.setName(request.getName());
        role.setDescription(request.getDescription());

        Role updatedRole = roleRepository.save(role);
        log.info("Updated role: {} for tenant: {}", updatedRole.getCode(), tenantId);

        // Audit log
        auditLogService.logAction("ROLE", updatedRole.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.UPDATE,
                Map.of("name", oldName, "description", oldDescription),
                Map.of("name", updatedRole.getName(), "description", updatedRole.getDescription()),
                "Updated role: " + updatedRole.getName());

        return mapToResponse(updatedRole);
    }

    @Transactional
    public void deleteRole(UUID roleId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        // Prevent deleting system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException("Cannot delete system role");
        }

        // Check if role is assigned to any users
        if (roleRepository.isRoleAssignedToUsers(roleId)) {
            throw new BusinessException("Cannot delete role that is assigned to users");
        }

        roleRepository.delete(role);
        log.info("Deleted role: {} for tenant: {}", role.getCode(), tenantId);

        // Audit log
        auditLogService.logAction("ROLE", role.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.DELETE,
                role, null, "Deleted role: " + role.getName());
    }

    @Transactional
    public RoleResponse assignPermissions(UUID roleId, AssignPermissionsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        // Prevent modifying system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException("Cannot modify permissions for system role");
        }

        // Get permissions from codes
        List<Permission> permissions = permissionRepository.findByCodeIn(request.getPermissionCodes());

        // Validate all permission codes exist
        if (permissions.size() != request.getPermissionCodes().size()) {
            throw new ValidationException("One or more permission codes are invalid");
        }

        // Capture old permissions for audit
        Set<String> oldPermissions = role.getPermissions().stream()
                .map(rolePerm -> rolePerm.getPermission().getCode())
                .collect(Collectors.toSet());

        // Replace existing permissions with new set
        role.getPermissions().clear();
        for (Permission perm : permissions) {
            role.addPermission(perm, com.hrms.domain.user.RoleScope.GLOBAL);
        }

        Role updatedRole = roleRepository.save(role);
        log.info("Updated permissions for role: {} for tenant: {}", updatedRole.getCode(), tenantId);

        // Audit log
        auditLogService.logAction("ROLE", updatedRole.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.PERMISSION_CHANGE,
                Map.of("permissions", oldPermissions),
                Map.of("permissions", request.getPermissionCodes()),
                "Assigned permissions to role: " + updatedRole.getName());

        return mapToResponse(updatedRole);
    }

    @Transactional
    public RoleResponse addPermissions(UUID roleId, AssignPermissionsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        // Prevent modifying system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException("Cannot modify permissions for system role");
        }

        // Get permissions from codes
        List<Permission> permissions = permissionRepository.findByCodeIn(request.getPermissionCodes());

        // Add new permissions to existing ones
        for (Permission perm : permissions) {
            // Check if permission already exists to avoid duplicates (though Set handles
            // it, RolePermission logic might not)
            boolean exists = role.getPermissions().stream()
                    .anyMatch(rp -> rp.getPermission().equals(perm));

            if (!exists) {
                role.addPermission(perm, com.hrms.domain.user.RoleScope.GLOBAL);
            }
        }

        Role updatedRole = roleRepository.save(role);
        log.info("Added permissions to role: {} for tenant: {}", updatedRole.getCode(), tenantId);

        return mapToResponse(updatedRole);
    }

    @Transactional
    public RoleResponse removePermissions(UUID roleId, AssignPermissionsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        // Prevent modifying system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException("Cannot modify permissions for system role");
        }

        // Get permissions from codes
        List<Permission> permissions = permissionRepository.findByCodeIn(request.getPermissionCodes());

        // Remove permissions from existing ones
        for (Permission perm : permissions) {
            role.removePermission(perm);
        }

        Role updatedRole = roleRepository.save(role);
        log.info("Removed permissions from role: {} for tenant: {}", updatedRole.getCode(), tenantId);

        return mapToResponse(updatedRole);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<com.hrms.domain.user.User> users = userRepository.findByTenantId(tenantId); // Assuming this method exists
                                                                                         // or we use findAll with
                                                                                         // tenant filter
        // Ideally mapped through repository but using fallback logic if custom method
        // needed
        return users.stream()
                .map(this::mapUserToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponse assignRolesToUser(UUID userId, AssignRolesRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        com.hrms.domain.user.User user = userRepository.findByIdAndTenantId(userId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Get roles by codes
        List<Role> roles = roleRepository.findByCodeInAndTenantId(request.getRoleCodes(), tenantId);

        // Validate all role codes exist
        if (roles.size() != request.getRoleCodes().size()) {
            throw new ValidationException("One or more role codes are invalid");
        }

        // Prevent assigning system roles via this API if restricted (optional, but good
        // practice)
        // For now allowing all roles valid for the tenant

        // Capture old roles for audit
        Set<String> oldRoles = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());

        // Update user roles
        user.setRoles(new HashSet<>(roles));

        com.hrms.domain.user.User updatedUser = userRepository.save(user);
        log.info("Assigned roles to user: {} for tenant: {}", user.getEmail(), tenantId);

        // Audit log
        auditLogService.logAction("USER", updatedUser.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.UPDATE,
                Map.of("roles", oldRoles),
                Map.of("roles", request.getRoleCodes()),
                "Assigned roles to user: " + updatedUser.getEmail());

        return mapUserToResponse(updatedUser);
    }

    private UserResponse mapUserToResponse(com.hrms.domain.user.User user) {
        Set<RoleResponse> roleResponses = user.getRoles().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toSet());

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .userStatus(user.getStatus().name())
                .roles(roleResponses)
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt()) // Assuming BaseEntity or similar has this
                .build();
    }

    private RoleResponse mapToResponse(Role role) {
        Set<PermissionResponse> permissionResponses = role.getPermissions().stream()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toSet());

        return new RoleResponse(
                role.getId(),
                role.getCode(),
                role.getName(),
                role.getDescription(),
                role.getIsSystemRole(),
                role.getTenantId(),
                permissionResponses,
                role.getCreatedAt(),
                role.getUpdatedAt());
    }

    private PermissionResponse mapPermissionToResponse(com.hrms.domain.user.RolePermission rolePermission) {
        Permission permission = rolePermission.getPermission();
        return new PermissionResponse(
                permission.getId(),
                permission.getCode(),
                permission.getName(),
                permission.getDescription(),
                permission.getResource(),
                permission.getAction());
    }
}
