package com.hrms.application.admin.service;

import com.hrms.api.admin.dto.AdminStatsResponse;
import com.hrms.api.admin.dto.AdminUserResponse;
import com.hrms.api.admin.dto.UpdateUserRoleRequest;
import com.hrms.api.user.dto.RoleResponse;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.RoleHierarchy;
import com.hrms.common.security.SecurityContext;
import org.springframework.security.access.AccessDeniedException;
import com.hrms.domain.tenant.Tenant;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.User;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.WorkflowExecutionRepository;
import com.hrms.domain.workflow.WorkflowExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for SuperAdmin platform-level operations
 * SuperAdmin users can access all tenants and perform global administration
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final RoleRepository roleRepository;
    private final com.hrms.application.audit.service.AuditLogService auditLogService;
    private final WorkflowExecutionRepository workflowExecutionRepository;

    /**
     * Get global platform statistics
     * SuperAdmin only - aggregates data across all tenants
     */
    @Transactional(readOnly = true)
    public AdminStatsResponse getGlobalStats() {
        // Count all tenants
        long totalTenants = tenantRepository.count();

        // Count all employees across all tenants
        long totalEmployees = employeeRepository.count();

        // Single aggregate query — no longer loads all users into memory
        long activeUsers = userRepository.countByStatus(User.UserStatus.ACTIVE);

        // Single cross-tenant count query — replaces N+1 loop over all tenants
        long pendingApprovals = 0;
        try {
            pendingApprovals = workflowExecutionRepository.countAllPendingCrossTenant();
        } catch (Exception e) { // Intentional broad catch — admin operation error boundary
            log.warn("Could not count pending approvals: {}", e.getMessage());
        }

        return AdminStatsResponse.builder()
                .totalTenants(totalTenants)
                .totalEmployees(totalEmployees)
                .pendingApprovals(pendingApprovals)
                .activeUsers(activeUsers)
                .build();
    }

    /**
     * Get paginated list of all users across all tenants
     * SuperAdmin only - can see all users with tenant information
     */
    @Transactional(readOnly = true)
    public Page<AdminUserResponse> getAllUsers(Pageable pageable) {
        Page<User> usersPage = userRepository.findAll(pageable);

        // Build a map of tenant IDs to tenant names for efficient lookup
        Set<UUID> tenantIds = usersPage.getContent().stream()
                .map(User::getTenantId)
                .collect(Collectors.toSet());

        Map<UUID, String> tenantMap = new HashMap<>();
        tenantRepository.findAllById(tenantIds)
                .forEach(tenant -> tenantMap.put(tenant.getId(), tenant.getName()));

        // BUG-007 FIX: Batch-lookup employee department names for all users on this page.
        // User -> Employee (by userId) -> departmentId -> Department name.
        // Two batch queries instead of N+1.
        Set<UUID> userIds = usersPage.getContent().stream()
                .map(User::getId)
                .collect(Collectors.toSet());
        Map<UUID, UUID> userDeptMap = new HashMap<>(); // userId -> departmentId
        employeeRepository.findAllByUserIdIn(userIds)
                .forEach(emp -> {
                    if (emp.getDepartmentId() != null && emp.getUser() != null) {
                        userDeptMap.put(emp.getUser().getId(), emp.getDepartmentId());
                    }
                });

        Set<UUID> deptIds = new HashSet<>(userDeptMap.values());
        Map<UUID, String> deptNameMap = new HashMap<>();
        if (!deptIds.isEmpty()) {
            departmentRepository.findAllById(deptIds)
                    .forEach(dept -> deptNameMap.put(dept.getId(), dept.getName()));
        }

        // Build final userId -> departmentName map
        Map<UUID, String> userDeptNameMap = new HashMap<>();
        userDeptMap.forEach((userId, deptId) -> {
            String name = deptNameMap.get(deptId);
            if (name != null) {
                userDeptNameMap.put(userId, name);
            }
        });

        return usersPage.map(user -> mapToAdminUserResponse(user,
                tenantMap.get(user.getTenantId()),
                userDeptNameMap.get(user.getId())));
    }

    /**
     * Privileged role codes that can only be assigned by a SuperAdmin.
     */
    private static final Set<String> PRIVILEGED_ROLE_CODES = Set.of(RoleHierarchy.SUPER_ADMIN);

    /**
     * Update a user's roles (SuperAdmin only)
     * Can assign/update roles for any user across any tenant
     */
    @Transactional
    public AdminUserResponse updateUserRole(UUID userId, UpdateUserRoleRequest request) {
        // DEF-49/50: Privilege escalation prevention — even though AdminController requires
        // SYSTEM_ADMIN, defense-in-depth: verify the caller is SuperAdmin before assigning SUPER_ADMIN role
        Set<String> privilegedRequested = request.getRoleCodes().stream()
                .filter(PRIVILEGED_ROLE_CODES::contains)
                .collect(Collectors.toSet());
        if (!privilegedRequested.isEmpty() && !SecurityContext.isSuperAdmin()) {
            log.warn("SECURITY: Privilege escalation attempt via admin API — user tried to assign {}",
                    privilegedRequested);
            throw new AccessDeniedException(
                    "Only SuperAdmin can assign privileged roles: " + privilegedRequested);
        }

        // Find user without tenant restriction (SuperAdmin has access to all)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        // DEF-49/50: Prevent non-SuperAdmin from modifying roles of a user who holds a privileged role
        boolean targetHasPrivilegedRole = user.getRoles().stream()
                .anyMatch(r -> PRIVILEGED_ROLE_CODES.contains(r.getCode()));
        if (targetHasPrivilegedRole && !SecurityContext.isSuperAdmin()) {
            log.warn("SECURITY: Privilege demotion attempt via admin API — non-SuperAdmin tried to modify roles of privileged user {}",
                    userId);
            throw new AccessDeniedException(
                    "Only SuperAdmin can modify roles of users holding privileged roles");
        }

        // Get roles by code - we assume these are system-wide role codes
        List<Role> roles = roleRepository.findByCodeInAndTenantId(request.getRoleCodes(), user.getTenantId());

        // Validate all role codes exist
        if (roles.size() != request.getRoleCodes().size()) {
            throw new ValidationException("One or more role codes are invalid");
        }

        // Capture old roles for audit
        Set<String> oldRoles = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());

        // Update user roles
        user.setRoles(new HashSet<>(roles));

        User updatedUser = userRepository.save(user);
        log.info("SuperAdmin updated roles for user: {} (email: {})", userId, user.getEmail());

        // Audit log
        auditLogService.logAction("USER", updatedUser.getId(),
                com.hrms.domain.audit.AuditLog.AuditAction.UPDATE,
                Map.of("roles", oldRoles),
                Map.of("roles", request.getRoleCodes()),
                "SuperAdmin updated user roles for: " + updatedUser.getEmail());

        // Get tenant name
        Tenant tenant = tenantRepository.findById(user.getTenantId())
                .orElse(null);
        String tenantName = tenant != null ? tenant.getName() : "Unknown";

        // Resolve department name for the updated user
        String departmentName = null;
        Employee linkedEmployee = employeeRepository
                .findByUserIdAndTenantId(updatedUser.getId(), updatedUser.getTenantId())
                .orElse(null);
        if (linkedEmployee != null && linkedEmployee.getDepartmentId() != null) {
            departmentName = departmentRepository.findById(linkedEmployee.getDepartmentId())
                    .map(Department::getName)
                    .orElse(null);
        }

        return mapToAdminUserResponse(updatedUser, tenantName, departmentName);
    }

    /**
     * Map User entity to AdminUserResponse with tenant and department information
     */
    private AdminUserResponse mapToAdminUserResponse(User user, String tenantName, String departmentName) {
        Set<RoleResponse> roleResponses = user.getRoles().stream()
                .map(this::mapRoleToResponse)
                .collect(Collectors.toSet());

        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .userStatus(user.getStatus().name())
                .tenantId(user.getTenantId())
                .tenantName(tenantName)
                .departmentName(departmentName)
                .roles(roleResponses)
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
    }

    /**
     * Map Role entity to RoleResponse
     */
    private RoleResponse mapRoleToResponse(Role role) {
        Set<com.hrms.api.user.dto.PermissionResponse> permissionResponses = role.getPermissions().stream()
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

    /**
     * Map RolePermission to PermissionResponse
     */
    private com.hrms.api.user.dto.PermissionResponse mapPermissionToResponse(
            com.hrms.domain.user.RolePermission rolePermission) {
        com.hrms.domain.user.Permission permission = rolePermission.getPermission();

        // Map custom targets if CUSTOM scope
        Set<com.hrms.api.user.dto.PermissionResponse.CustomTargetResponse> customTargetResponses = null;
        if (rolePermission.getScope() == com.hrms.domain.user.RoleScope.CUSTOM &&
            rolePermission.getCustomTargets() != null &&
            !rolePermission.getCustomTargets().isEmpty()) {
            customTargetResponses = rolePermission.getCustomTargets().stream()
                    .map(target -> com.hrms.api.user.dto.PermissionResponse.CustomTargetResponse.builder()
                            .id(target.getId())
                            .targetType(target.getTargetType())
                            .targetId(target.getTargetId())
                            .targetName("Unknown") // In global context, we don't resolve names
                            .build())
                    .collect(Collectors.toSet());
        }

        return com.hrms.api.user.dto.PermissionResponse.builder()
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
}
