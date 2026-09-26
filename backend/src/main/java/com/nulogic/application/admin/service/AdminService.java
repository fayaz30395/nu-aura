package com.nulogic.application.admin.service;

import com.nulogic.api.admin.dto.AdminStatsResponse;
import com.nulogic.api.admin.dto.AdminUserResponse;
import com.nulogic.api.admin.dto.UpdateUserRoleRequest;
import com.nulogic.api.user.dto.RoleResponse;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.PermissionCacheEvictor;
import com.nulogic.common.security.RoleHierarchy;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.employee.Department;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.domain.user.Role;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import com.nulogic.infrastructure.workflow.repository.WorkflowExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for SuperAdmin platform-level operations
 * SuperAdmin users can access all tenants and perform global administration
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    /**
     * Privileged role codes that can only be assigned by a SuperAdmin.
     */
    private static final Set<String> PRIVILEGED_ROLE_CODES = Set.of(RoleHierarchy.SUPER_ADMIN);
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final RoleRepository roleRepository;
    private final com.nulogic.application.audit.service.AuditLogService auditLogService;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final PermissionCacheEvictor permissionCacheEvictor;

    /**
     * Get platform settings
     * Returns current platform configuration
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getPlatformSettings() {
        long totalTenants = tenantRepository.count();
        long totalUsers = userRepository.count();
        long totalEmployees = employeeRepository.count();
        long totalDepartments = departmentRepository.count();

        java.util.Map<String, Object> settings = new java.util.LinkedHashMap<>();
        settings.put("platform", "NU-AURA HRMS");
        settings.put("version", "2.0");
        settings.put("totalTenants", totalTenants);
        settings.put("totalUsers", totalUsers);
        settings.put("totalEmployees", totalEmployees);
        settings.put("totalDepartments", totalDepartments);
        settings.put("multiTenancy", true);
        settings.put("rbacEnabled", true);
        settings.put("mfaSupported", true);
        return settings;
    }

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
     * Update a user's roles (SuperAdmin only)
     * Can assign/update roles for any user across any tenant
     */
    @Transactional
    // SEC (remediation 2026-09-25): this is the SECOND path that mutates a user's explicit roles
    // (the other is RoleManagementService.assignRolesToUser). Since
    // SecurityService.getCachedPermissionScopesForUser became @Cacheable, that map is what
    // JwtAuthenticationFilter turns into the principal's authorities — so without an eviction a
    // demotion made through the admin API kept serving the OLD role's permissions from the
    // rolePermissions cache for up to its 15-minute TTL, and a re-login inside that window hit
    // the same stale entry.
    //
    // The eviction is an explicit after-commit call via PermissionCacheEvictor rather than
    // @CacheEvict(allEntries = true). @CacheEvict fires relative to ADVISOR ORDER, and the cache
    // and transaction advisors both sit at Ordered.LOWEST_PRECEDENCE here — nothing declares which
    // wins. CacheEvictTransactionOrderingTest measures the current answer (cache advisor outer, so
    // eviction does land after commit today) but that is registration order, not a contract. If it
    // ever flipped, the flush would run before this transaction commits and a concurrent
    // authorization lookup would re-cache the PRE-demotion authorities for the full TTL. Routing
    // through the evictor makes the timing explicit instead of incidental.
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

        // allEntries: the user-keyed entries and the role-keyed entries are not reachable from one
        // key, and a role's permission set is shared by every holder. Deferred to after commit.
        permissionCacheEvictor.evictAllPermissions();

        // Audit log
        auditLogService.logAction("USER", updatedUser.getId(),
                com.nulogic.domain.audit.AuditLog.AuditAction.UPDATE,
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
            departmentName = departmentRepository.findByIdAndTenantId(
                            linkedEmployee.getDepartmentId(), updatedUser.getTenantId())
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
        Set<com.nulogic.api.user.dto.PermissionResponse> permissionResponses = role.getPermissions().stream()
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
    private com.nulogic.api.user.dto.PermissionResponse mapPermissionToResponse(
            com.nulogic.domain.user.RolePermission rolePermission) {
        com.nulogic.domain.user.Permission permission = rolePermission.getPermission();

        // Map custom targets if CUSTOM scope
        Set<com.nulogic.api.user.dto.PermissionResponse.CustomTargetResponse> customTargetResponses = null;
        if (rolePermission.getScope() == com.nulogic.domain.user.RoleScope.CUSTOM &&
                rolePermission.getCustomTargets() != null &&
                !rolePermission.getCustomTargets().isEmpty()) {
            customTargetResponses = rolePermission.getCustomTargets().stream()
                    .map(target -> com.nulogic.api.user.dto.PermissionResponse.CustomTargetResponse.builder()
                            .id(target.getId())
                            .targetType(target.getTargetType())
                            .targetId(target.getTargetId())
                            .targetName("Unknown") // In global context, we don't resolve names
                            .build())
                    .collect(Collectors.toSet());
        }

        return com.nulogic.api.user.dto.PermissionResponse.builder()
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
