package com.hrms.common.security;

import com.hrms.common.config.CacheConfig;
import com.hrms.domain.user.ImplicitUserRole;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.RolePermission;
import com.hrms.infrastructure.user.repository.ImplicitUserRoleRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service("securityService")
@RequiredArgsConstructor
public class SecurityService {

    private final RoleRepository roleRepository;
    private final ImplicitUserRoleRepository implicitUserRoleRepository;

    public boolean hasPermission(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated() || permissionCode == null) {
            return false;
        }

        // 1. Check direct authorities (which may contain permissions directly from JWT)
        boolean hasDirectAuth = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals(permissionCode));
        if (hasDirectAuth)
            return true;

        // 2. Check roles-based permissions from DB/Cache
        Collection<String> authorities = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toSet());

        Set<String> userPermissions = getCachedPermissions(authorities);

        // Direct match
        if (userPermissions.contains(permissionCode)) {
            return true;
        }

        // App-prefixed match
        String appCode = SecurityContext.getCurrentAppCode();
        if (appCode != null && !permissionCode.startsWith(appCode + ":")) {
            if (userPermissions.contains(appCode + ":" + permissionCode)) {
                return true;
            }
        }

        return false;
    }

    /**
     * BUG-009 FIX: Guard against null TenantContext in async / scheduled callers.
     *
     * <p>Previously the {@code @Cacheable} key was built with
     * {@link TenantContext#getCurrentTenant()} which returns {@code null} when
     * this method is invoked outside of an HTTP request (e.g. Kafka consumers,
     * {@code @Async} methods, scheduled jobs).  A null tenant produces the key
     * {@code "null::role1,role2"}, which can be populated by one async execution
     * and then returned for a different tenant's execution — effectively leaking
     * permission sets across tenants.</p>
     *
     * <p>Fix: {@code condition = "#root.target.isTenantContextPresent()"} prevents
     * caching when the ThreadLocal is absent.  The method still returns an empty
     * set so callers deny access safely in async contexts.</p>
     */
    @Cacheable(
        value = CacheConfig.ROLE_PERMISSIONS,
        key = "#root.target.rolesCacheKey(#roles)",
        condition = "#root.target.isTenantContextPresent()"
    )
    @Transactional(readOnly = true)
    public Set<String> getCachedPermissions(Collection<String> roles) {
        Set<String> permissions = new HashSet<>();
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || roles == null || roles.isEmpty()) {
            // No tenant context — return empty set.
            // The condition above prevents caching this empty result,
            // so no cross-tenant pollution occurs.
            log.warn("getCachedPermissions called without TenantContext; returning empty permissions");
            return permissions;
        }
        List<Role> activeRoles = roleRepository.findByCodeInAndTenantId(roles, tenantId);
        for (Role role : activeRoles) {
            if (role.getPermissions() != null) {
                for (RolePermission rp : role.getPermissions()) {
                    permissions.add(rp.getPermission().getCode());
                }
            }
        }
        return permissions;
    }

    /**
     * Fetch permissions directly from the database, bypassing the cache.
     * Used by {@link PermissionAspect} when {@code @RequiresPermission(revalidate = true)}
     * is set on sensitive operations (payroll, admin, role changes).
     *
     * <p>This ensures that even if a user's role was revoked after JWT issuance,
     * the permission check reflects their current DB state.</p>
     */
    @Transactional(readOnly = true)
    public Set<String> getFreshPermissions(Collection<String> roles) {
        Set<String> permissions = new HashSet<>();
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || roles == null || roles.isEmpty()) {
            return permissions;
        }
        List<Role> activeRoles = roleRepository.findByCodeInAndTenantId(roles, tenantId);
        for (Role role : activeRoles) {
            if (role.getPermissions() != null) {
                for (RolePermission rp : role.getPermissions()) {
                    permissions.add(rp.getPermission().getCode());
                }
            }
        }
        return permissions;
    }

    /** Used by the {@code @Cacheable} condition SpEL expression. */
    public boolean isTenantContextPresent() {
        return TenantContext.getCurrentTenant() != null;
    }

    public String rolesCacheKey(Collection<String> roles) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            // Should never be reached when condition=isTenantContextPresent() is in effect,
            // but provide a safe non-null value as a defensive fallback.
            return "NO_TENANT::" + String.join(",", new java.util.TreeSet<>(roles));
        }
        java.util.TreeSet<String> sorted = new java.util.TreeSet<>(roles);
        return tenantId + "::" + String.join(",", sorted);
    }

    /**
     * NEW METHOD (Task 8): Load permissions for a specific user, merging explicit roles
     * + implicit roles + role hierarchy inheritance.
     *
     * Cache key: "permissions:{tenantId}:{userId}"
     * TTL: 5 minutes (short-lived, user-specific)
     *
     * Algorithm:
     * 1. Load explicit role permissions from provided role codes
     * 2. Walk parent_role_id chain for each explicit role (max depth 10, cycle detection)
     * 3. Load active implicit roles for the user
     * 4. Walk parent chain for each implicit role's role
     * 5. Merge all permissions additively into a Set<String>
     *
     * @param userId UUID of the user (from JWT)
     * @param explicitRoleCodes Collection of explicit role codes (from JWT)
     * @return Set of permission codes (database format: "module.action")
     */
    @Cacheable(
        value = CacheConfig.ROLE_PERMISSIONS,
        key = "'permissions:' + #root.target.userCacheKey(#userId)",
        condition = "#root.target.isTenantContextPresent()"
    )
    @Transactional(readOnly = true)
    public Set<String> getCachedPermissionsForUser(UUID userId, Collection<String> explicitRoleCodes) {
        Set<String> allPermissions = new HashSet<>();
        UUID tenantId = TenantContext.getCurrentTenant();

        if (tenantId == null || userId == null) {
            log.warn("getCachedPermissionsForUser called without TenantContext or userId; returning empty permissions");
            return allPermissions;
        }

        // PERF-M01: Load ALL tenant roles with permissions in a single query,
        // then reuse the in-memory map for all hierarchy walks below.
        List<Role> allTenantRoles = roleRepository.findByTenantIdWithPermissions(tenantId);
        Map<UUID, Role> roleMap = new HashMap<>();
        for (Role r : allTenantRoles) {
            roleMap.put(r.getId(), r);
        }

        // 1. Load explicit role permissions + inheritance chain
        if (explicitRoleCodes != null && !explicitRoleCodes.isEmpty()) {
            List<Role> explicitRoles = roleRepository.findByCodeInAndTenantId(explicitRoleCodes, tenantId);
            for (Role role : explicitRoles) {
                Set<String> rolePerms = flattenRolePermissions(role, roleMap);
                allPermissions.addAll(rolePerms);
            }
        }

        // 2. Load implicit roles for this user (active only)
        List<ImplicitUserRole> implicitRoles = implicitUserRoleRepository
                .findByUserIdAndTenantIdAndIsActiveTrue(userId, tenantId);

        for (ImplicitUserRole implicitRole : implicitRoles) {
            Role implicitRoleEntity = roleMap.get(implicitRole.getRoleId());
            if (implicitRoleEntity != null) {
                Set<String> rolePerms = flattenRolePermissions(implicitRoleEntity, roleMap);
                allPermissions.addAll(rolePerms);
            }
        }

        log.debug("getCachedPermissionsForUser: user={}, explicitRoles={}, implicitRoles={}, totalPermissions={}",
                userId, explicitRoleCodes, implicitRoles.size(), allPermissions.size());

        return allPermissions;
    }

    /**
     * PERF-M01 FIX: Walk parent_role_id chain to collect all permissions for a role
     * and all its ancestors (up the inheritance hierarchy).
     *
     * Uses a pre-loaded in-memory roleMap to avoid any DB queries during hierarchy walks.
     * The caller is responsible for loading all tenant roles once via
     * {@code roleRepository.findByTenantIdWithPermissions(tenantId)}.
     *
     * @param role The role to start from
     * @param roleMap Pre-loaded map of roleId -> Role (with permissions) for the tenant
     * @return Set of permission codes (directly assigned + inherited from parent roles)
     */
    private Set<String> flattenRolePermissions(Role role, Map<UUID, Role> roleMap) {
        Set<String> permissions = new HashSet<>();
        Set<UUID> visited = new HashSet<>();

        Queue<Role> toProcess = new LinkedList<>();
        toProcess.offer(role);

        int depth = 0;
        int maxDepth = 10;

        while (!toProcess.isEmpty() && depth < maxDepth) {
            Role current = toProcess.poll();

            if (current == null || visited.contains(current.getId())) {
                continue;
            }

            visited.add(current.getId());

            // Add permissions from this role
            if (current.getPermissions() != null) {
                for (RolePermission rp : current.getPermissions()) {
                    permissions.add(rp.getPermission().getCode());
                }
            }

            // Walk parent chain via in-memory map — no additional DB queries
            if (current.getParentRoleId() != null) {
                Role parent = roleMap.get(current.getParentRoleId());
                if (parent != null) {
                    toProcess.offer(parent);
                }
            }

            depth++;
        }

        if (depth >= maxDepth) {
            log.warn("flattenRolePermissions: max depth exceeded for role {}", role.getId());
        }

        return permissions;
    }

    /**
     * Cache key builder for user-keyed cache entries.
     * Used by @Cacheable condition SpEL.
     */
    public String userCacheKey(UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return "NO_TENANT::" + userId;
        }
        return tenantId + ":" + userId;
    }

    // Check if user is the current employee
    public boolean isCurrentEmployee(Authentication authentication, String employeeId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.hrms.common.security.UserPrincipal) {
            com.hrms.common.security.UserPrincipal userPrincipal = (com.hrms.common.security.UserPrincipal) principal;
            return userPrincipal.getId() != null && userPrincipal.getId().toString().equals(employeeId);
        }
        return false;
    }
}
