package com.hrms.application.user.service;

import com.hrms.api.user.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.domain.employee.Department;
import com.hrms.domain.attendance.OfficeLocation;
import com.hrms.domain.user.*;
import com.hrms.infrastructure.attendance.repository.OfficeLocationRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.common.config.CacheConfig;
import com.hrms.infrastructure.user.repository.CustomScopeTargetRepository;
import com.hrms.infrastructure.user.repository.PermissionRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoleManagementService {

    private static final String ROLE_NOT_FOUND = "Role not found";
    private static final String CANNOT_MODIFY_SYSTEM_ROLE = "Cannot modify permissions for system role";

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final CustomScopeTargetRepository customScopeTargetRepository;
    private final com.hrms.infrastructure.user.repository.UserRepository userRepository;
    private final com.hrms.application.audit.service.AuditLogService auditLogService;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final OfficeLocationRepository officeLocationRepository;

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
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));
        return mapToResponse(role);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
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
                null, buildRoleAuditPayload(savedRole), "Created role: " + savedRole.getName());

        return mapToResponse(savedRole);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
    public RoleResponse updateRole(UUID roleId, UpdateRoleRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));

        // Prevent updating system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException("Cannot update system role");
        }

        // Capture old values for audit
        String oldName = role.getName();
        String oldDescription = role.getDescription();
        UUID oldParentRoleId = role.getParentRoleId();

        // Update basic fields
        role.setName(request.getName());
        role.setDescription(request.getDescription());

        // Task 9: Handle parentRoleId if provided in request
        if (request.getParentRoleId() != null || (request.getParentRoleId() == null && oldParentRoleId != null)) {
            UUID newParentId = request.getParentRoleId();
            if (newParentId != null) {
                // Validate the parent role assignment (check for cycles, etc.)
                validateAndSetParentRole(roleId, newParentId, tenantId);
            }
            role.setParentRoleId(newParentId);
        }

        Role updatedRole = roleRepository.save(role);
        log.info("Updated role: {} for tenant: {}", updatedRole.getCode(), tenantId);

        // Audit log — use HashMap because Map.of() does not accept null values
        Map<String, Object> oldAudit = new HashMap<>();
        oldAudit.put("name", oldName);
        oldAudit.put("description", oldDescription);
        oldAudit.put("parentRoleId", oldParentRoleId);

        Map<String, Object> newAudit = new HashMap<>();
        newAudit.put("name", updatedRole.getName());
        newAudit.put("description", updatedRole.getDescription());
        newAudit.put("parentRoleId", updatedRole.getParentRoleId());
        auditLogService.logAction("ROLE", updatedRole.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.UPDATE,
                oldAudit,
                newAudit,
                "Updated role: " + updatedRole.getName());

        return mapToResponse(updatedRole);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
    public void deleteRole(UUID roleId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));

        // Prevent deleting system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException("Cannot delete system role");
        }

        // Check if role is assigned to any users
        if (roleRepository.isRoleAssignedToUsers(roleId)) {
            throw new BusinessException("Cannot delete role that is assigned to users");
        }

        Map<String, Object> deletedRoleAudit = buildRoleAuditPayload(role);
        roleRepository.delete(role);
        log.info("Deleted role: {} for tenant: {}", role.getCode(), tenantId);

        // Audit log
        auditLogService.logAction("ROLE", role.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.DELETE,
                deletedRoleAudit, null, "Deleted role: " + role.getName());
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
    public RoleResponse assignPermissions(UUID roleId, AssignPermissionsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));

        // Prevent modifying system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException(CANNOT_MODIFY_SYSTEM_ROLE);
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

    /**
     * Assign permissions with specific scopes to a role (Keka-style RBAC).
     * Supports ALL, LOCATION, DEPARTMENT, TEAM, SELF, and CUSTOM scopes.
     */
    @Transactional
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
    public RoleResponse assignPermissionsWithScope(UUID roleId, AssignPermissionsWithScopeRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));

        // Prevent modifying system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException(CANNOT_MODIFY_SYSTEM_ROLE);
        }

        // Capture old permissions for audit
        Set<String> oldPermissions = role.getPermissions().stream()
                .map(rp -> rp.getPermission().getCode() + ":" + rp.getScope())
                .collect(Collectors.toSet());

        // Get permission codes from request
        Set<String> permissionCodes = request.getPermissions().stream()
                .map(PermissionScopeRequest::getPermissionCode)
                .collect(Collectors.toSet());

        // Fetch all permissions by code
        List<Permission> permissions = permissionRepository.findByCodeIn(permissionCodes);
        Map<String, Permission> permissionMap = permissions.stream()
                .collect(Collectors.toMap(Permission::getCode, p -> p));

        // Validate all permission codes exist
        for (String code : permissionCodes) {
            if (!permissionMap.containsKey(code)) {
                throw new ValidationException("Permission code not found: " + code);
            }
        }

        // Replace or update permissions
        if (request.isReplaceAll()) {
            role.getPermissions().clear();
        }

        for (PermissionScopeRequest permReq : request.getPermissions()) {
            Permission permission = permissionMap.get(permReq.getPermissionCode());
            RoleScope scope = permReq.getScope();

            // Validate CUSTOM scope has targets
            if (scope == RoleScope.CUSTOM &&
                (permReq.getCustomTargets() == null || permReq.getCustomTargets().isEmpty())) {
                throw new ValidationException("CUSTOM scope requires at least one target for permission: " +
                    permReq.getPermissionCode());
            }

            // Find existing or create new RolePermission
            RolePermission rolePermission = role.getPermissions().stream()
                    .filter(rp -> rp.getPermission().getCode().equals(permReq.getPermissionCode()))
                    .findFirst()
                    .orElse(null);

            if (rolePermission != null) {
                // Update existing permission scope
                rolePermission.setScope(scope);
                // Clear existing custom targets and add new ones
                rolePermission.getCustomTargets().clear();
            } else {
                // Add new permission with scope
                rolePermission = role.addPermission(permission, scope);
            }

            // Add custom targets if CUSTOM scope
            if (scope == RoleScope.CUSTOM && permReq.getCustomTargets() != null) {
                for (PermissionScopeRequest.CustomTargetRequest targetReq : permReq.getCustomTargets()) {
                    CustomScopeTarget target = CustomScopeTarget.builder()
                            .targetType(targetReq.getTargetType())
                            .targetId(targetReq.getTargetId())
                            .build();
                    rolePermission.addCustomTarget(target);
                }
            }
        }

        Role updatedRole = roleRepository.save(role);
        log.info("Updated permissions with scopes for role: {} for tenant: {}", updatedRole.getCode(), tenantId);

        // Audit log
        Set<String> newPermissions = updatedRole.getPermissions().stream()
                .map(rp -> rp.getPermission().getCode() + ":" + rp.getScope())
                .collect(Collectors.toSet());

        auditLogService.logAction("ROLE", updatedRole.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.PERMISSION_CHANGE,
                Map.of("permissions", oldPermissions),
                Map.of("permissions", newPermissions),
                "Assigned permissions with scopes to role: " + updatedRole.getName());

        return mapToResponse(updatedRole);
    }

    /**
     * Update scope for a single permission on a role.
     */
    @Transactional
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
    public RoleResponse updatePermissionScope(UUID roleId, String permissionCode, RoleScope newScope,
                                               Set<PermissionScopeRequest.CustomTargetRequest> customTargets) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));

        if (role.getIsSystemRole()) {
            throw new BusinessException(CANNOT_MODIFY_SYSTEM_ROLE);
        }

        RolePermission rolePermission = role.getPermissions().stream()
                .filter(rp -> rp.getPermission().getCode().equals(permissionCode))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Permission " + permissionCode + " not found on role"));

        // Validate CUSTOM scope has targets
        if (newScope == RoleScope.CUSTOM && (customTargets == null || customTargets.isEmpty())) {
            throw new ValidationException("CUSTOM scope requires at least one target");
        }

        RoleScope oldScope = rolePermission.getScope();
        rolePermission.setScope(newScope);

        // Handle custom targets
        rolePermission.getCustomTargets().clear();
        if (newScope == RoleScope.CUSTOM && customTargets != null) {
            for (PermissionScopeRequest.CustomTargetRequest targetReq : customTargets) {
                CustomScopeTarget target = CustomScopeTarget.builder()
                        .targetType(targetReq.getTargetType())
                        .targetId(targetReq.getTargetId())
                        .build();
                rolePermission.addCustomTarget(target);
            }
        }

        Role updatedRole = roleRepository.save(role);
        log.info("Updated scope for permission {} on role {} from {} to {}",
                permissionCode, role.getCode(), oldScope, newScope);

        return mapToResponse(updatedRole);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
    public RoleResponse addPermissions(UUID roleId, AssignPermissionsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));

        // Prevent modifying system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException(CANNOT_MODIFY_SYSTEM_ROLE);
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
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
    public RoleResponse removePermissions(UUID roleId, AssignPermissionsRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        Role role = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(ROLE_NOT_FOUND));

        // Prevent modifying system roles
        if (role.getIsSystemRole()) {
            throw new BusinessException(CANNOT_MODIFY_SYSTEM_ROLE);
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
    @CacheEvict(value = CacheConfig.ROLE_PERMISSIONS, allEntries = true)
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

    private PermissionResponse mapPermissionToResponse(RolePermission rolePermission) {
        Permission permission = rolePermission.getPermission();

        // Map custom targets if CUSTOM scope
        Set<PermissionResponse.CustomTargetResponse> customTargetResponses = null;
        if (rolePermission.getScope() == RoleScope.CUSTOM &&
            rolePermission.getCustomTargets() != null &&
            !rolePermission.getCustomTargets().isEmpty()) {
            customTargetResponses = rolePermission.getCustomTargets().stream()
                    .map(target -> PermissionResponse.CustomTargetResponse.builder()
                            .id(target.getId())
                            .targetType(target.getTargetType())
                            .targetId(target.getTargetId())
                            .targetName(resolveTargetName(target))
                            .build())
                    .collect(Collectors.toSet());
        }

        return PermissionResponse.builder()
                .id(permission.getId())
                .code(permission.getCode())
                .name(permission.getName())
                .description(permission.getDescription())
                .resource(permission.getResource())
                .action(permission.getAction())
                .scope(rolePermission.getScope())
                .customTargets(customTargetResponses)
                .build();
    }

    private Map<String, Object> buildRoleAuditPayload(Role role) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", role.getId());
        payload.put("code", role.getCode());
        payload.put("name", role.getName());
        payload.put("description", role.getDescription());
        payload.put("isSystemRole", role.getIsSystemRole());

        // Build detailed permission info with scope and custom targets
        List<Map<String, Object>> permissionDetails = role.getPermissions().stream()
                .map(rp -> {
                    Map<String, Object> permInfo = new LinkedHashMap<>();
                    permInfo.put("code", rp.getPermission().getCode());
                    permInfo.put("scope", rp.getScope() != null ? rp.getScope().name() : "GLOBAL");

                    // Include custom target IDs for CUSTOM scope
                    if (rp.getScope() == RoleScope.CUSTOM && rp.getCustomTargets() != null
                            && !rp.getCustomTargets().isEmpty()) {
                        List<Map<String, Object>> targets = rp.getCustomTargets().stream()
                                .map(t -> {
                                    Map<String, Object> targetInfo = new LinkedHashMap<>();
                                    targetInfo.put("type", t.getTargetType().name());
                                    targetInfo.put("id", t.getTargetId());
                                    return targetInfo;
                                })
                                .collect(Collectors.toList());
                        permInfo.put("customTargets", targets);
                    }
                    return permInfo;
                })
                .collect(Collectors.toList());

        payload.put("permissions", permissionDetails);
        return payload;
    }

    /**
     * Resolve target name for EMPLOYEE, DEPARTMENT, or LOCATION custom scope targets.
     * Performs tenant-scoped lookup and returns a user-friendly name.
     */
    private String resolveTargetName(CustomScopeTarget target) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return switch (target.getTargetType()) {
            case EMPLOYEE -> employeeRepository.findByIdAndTenantId(target.getTargetId(), tenantId)
                    .map(emp -> emp.getFirstName() + " " + emp.getLastName())
                    .orElse("Unknown Employee");
            case DEPARTMENT -> departmentRepository.findByIdAndTenantId(target.getTargetId(), tenantId)
                    .map(Department::getName)
                    .orElse("Unknown Department");
            case LOCATION -> officeLocationRepository.findByIdAndTenantId(target.getTargetId(), tenantId)
                    .map(OfficeLocation::getLocationName)
                    .orElse("Unknown Location");
        };
    }

    /**
     * Task 9: Validate role parent assignment and detect cycles.
     *
     * Checks:
     * 1. If newParentId is null, clearing parent (always safe)
     * 2. If roleId equals newParentId, throw error (self-parent)
     * 3. Walk parent chain from newParentId upward to detect cycles
     * 4. Max depth 10 to prevent infinite loops
     *
     * @param roleId The role being updated
     * @param newParentId The proposed new parent role ID
     * @param tenantId The tenant context
     * @throws IllegalArgumentException if cycle detected or role is self-parent
     */
    @Transactional(readOnly = true)
    public void validateAndSetParentRole(UUID roleId, UUID newParentId, UUID tenantId) {
        if (newParentId == null) {
            // Clearing parent is always safe
            return;
        }

        // Check self-parent
        if (roleId.equals(newParentId)) {
            throw new IllegalArgumentException("Role cannot be its own parent");
        }

        // Walk parent chain from newParentId upward, checking for cycles
        Set<UUID> visited = new HashSet<>();
        Queue<UUID> toProcess = new LinkedList<>();
        toProcess.offer(newParentId);

        int depth = 0;
        int maxDepth = 10;

        while (!toProcess.isEmpty() && depth < maxDepth) {
            UUID currentRoleId = toProcess.poll();

            if (currentRoleId == null || visited.contains(currentRoleId)) {
                continue;
            }

            // Cycle detected: we found the role being updated in the parent chain
            if (currentRoleId.equals(roleId)) {
                throw new IllegalArgumentException(
                        "Cannot set parent role: would create a cycle in the role hierarchy");
            }

            visited.add(currentRoleId);

            // Load parent of current role
            Optional<Role> currentRoleOpt = roleRepository.findByIdAndTenantIdWithPermissions(currentRoleId, tenantId);
            if (currentRoleOpt.isPresent()) {
                Role currentRole = currentRoleOpt.get();
                if (currentRole.getParentRoleId() != null) {
                    toProcess.offer(currentRole.getParentRoleId());
                }
            }

            depth++;
        }

        if (depth >= maxDepth) {
            log.warn("validateAndSetParentRole: max depth exceeded; stopping cycle detection at depth {}", maxDepth);
        }

        log.debug("Parent role validation passed for roleId={} with newParentId={}", roleId, newParentId);
    }

    /**
     * Task 9: Get effective permissions for a role, including inherited permissions
     * from the parent role chain.
     *
     * Returns a set of permission responses, each marked with whether it's inherited
     * and from which parent level.
     *
     * @param roleId The role to get effective permissions for
     * @param tenantId The tenant context
     * @return Set of PermissionResponse objects
     */
    @Transactional(readOnly = true)
    public Set<PermissionResponse> getEffectivePermissions(UUID roleId, UUID tenantId) {
        Set<PermissionResponse> effectivePerms = new HashSet<>();
        Set<UUID> visitedRoles = new HashSet<>();
        Queue<Role> toProcess = new LinkedList<>();

        Optional<Role> roleOpt = roleRepository.findByIdAndTenantIdWithPermissions(roleId, tenantId);
        if (roleOpt.isEmpty()) {
            throw new ResourceNotFoundException(ROLE_NOT_FOUND);
        }

        toProcess.offer(roleOpt.get());

        int depth = 0;
        int maxDepth = 10;

        while (!toProcess.isEmpty() && depth < maxDepth) {
            Role current = toProcess.poll();

            if (current == null || visitedRoles.contains(current.getId())) {
                continue;
            }

            visitedRoles.add(current.getId());

            // Add permissions from this role
            if (current.getPermissions() != null) {
                for (RolePermission rolePermission : current.getPermissions()) {
                    PermissionResponse permResp = mapPermissionToResponse(rolePermission);
                    effectivePerms.add(permResp);
                }
            }

            // Add parent to queue if it exists
            if (current.getParentRoleId() != null) {
                Optional<Role> parentOpt = roleRepository.findByIdAndTenantIdWithPermissions(current.getParentRoleId(), tenantId);
                if (parentOpt.isPresent()) {
                    toProcess.offer(parentOpt.get());
                }
            }

            depth++;
        }

        if (depth >= maxDepth) {
            log.warn("getEffectivePermissions: max depth exceeded for role {}", roleId);
        }

        return effectivePerms;
    }
}
