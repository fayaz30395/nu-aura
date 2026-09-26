package com.nulogic.common.security;

import com.nulogic.common.config.CacheConfig;
import com.nulogic.domain.user.ImplicitUserRole;
import com.nulogic.domain.user.Role;
import com.nulogic.domain.user.RolePermission;
import com.nulogic.infrastructure.user.repository.ImplicitUserRoleRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

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
     * Breadth ranking for {@link com.nulogic.domain.user.RoleScope}, used only to resolve the
     * conflict where one permission reaches a user through several roles at different scopes.
     *
     * <p>Higher wins. A user who is both a TEAM-scoped lead and an ALL-scoped admin must keep
     * ALL — taking the narrower scope would deny access they legitimately hold.
     * CUSTOM ranks lowest because it is an explicit allow-list, not a containing set.</p>
     */
    private static int scopeBreadth(com.nulogic.domain.user.RoleScope scope) {
        if (scope == null) {
            return -1;
        }
        return switch (scope) {
            case ALL -> 5;
            case LOCATION -> 4;
            case DEPARTMENT -> 3;
            case TEAM -> 2;
            case SELF -> 1;
            case CUSTOM -> 0;
        };
    }

    /** Keep the broader of two scopes for the same permission code. */
    private static void mergeScope(Map<String, com.nulogic.domain.user.RoleScope> target,
                                   String code,
                                   com.nulogic.domain.user.RoleScope scope) {
        com.nulogic.domain.user.RoleScope effective =
                scope != null ? scope : com.nulogic.domain.user.RoleScope.SELF;
        target.merge(code, effective,
                (a, b) -> scopeBreadth(a) >= scopeBreadth(b) ? a : b);
    }

    /**
     * Permission code -> effective {@link com.nulogic.domain.user.RoleScope} for the given roles.
     *
     * <p>Exists because the scope is the authorization decision, not decoration:
     * {@code LEAVE:VIEW_SELF} granted at SELF scope and the same code granted at ALL scope are
     * completely different grants. Callers that only need the codes use
     * {@link #getCachedPermissions(Collection)}, which loads the same rows independently
     * (it does not delegate here — the two are cached under different keys).</p>
     */
    @Cacheable(
            value = CacheConfig.ROLE_PERMISSIONS,
            // Same order-normalising key helper as getCachedPermissions: a raw #roles key makes
            // ["EMPLOYEE","MANAGER"] and ["MANAGER","EMPLOYEE"] two different cache entries.
            key = "'scopes:' + #root.target.rolesCacheKey(#roles)",
            condition = "#root.target.isTenantContextPresent() && #roles != null && !#roles.isEmpty()"
    )
    @Transactional(readOnly = true)
    public Map<String, com.nulogic.domain.user.RoleScope> getCachedPermissionScopes(Collection<String> roles) {
        Map<String, com.nulogic.domain.user.RoleScope> scopes = new HashMap<>();
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || roles == null || roles.isEmpty()) {
            log.warn("getCachedPermissionScopes called without TenantContext; returning empty permissions");
            return scopes;
        }
        List<Role> activeRoles = roleRepository.findByCodeInAndTenantId(roles, tenantId);
        for (Role role : activeRoles) {
            if (role.getPermissions() != null) {
                for (RolePermission rp : role.getPermissions()) {
                    mergeScope(scopes, rp.getPermission().getCode(), rp.getScope());
                }
            }
        }
        return scopes;
    }

    /**
     * Scope-preserving counterpart of {@link #getCachedPermissionsForUser(UUID, Collection)},
     * covering explicit roles, the inheritance chain, and active implicit roles.
     *
     * <p>PERF (remediation 2026-09-25): this MUST stay cached. Permissions no longer travel in
     * the JWT, so {@code JwtAuthenticationFilter} calls this on the userId branch for every
     * cookie-authenticated request. Uncached, each request ran
     * {@code findByTenantIdWithPermissions} (every role in the tenant joined to every
     * role_permissions and permissions row) plus an implicit-role lookup and a role-code lookup.
     * Cache key mirrors {@link #getCachedPermissionsForUser} with a distinct prefix so the two
     * return types never collide in the shared {@code rolePermissions} cache. Correctness of the
     * SEC-1 scope fix is preserved because every mutating method on RoleManagementService
     * carries {@code @CacheEvict(value = ROLE_PERMISSIONS, allEntries = true)}.</p>
     *
     * <p>Why the key omits {@code explicitRoleCodes}. The roles claim is not an independent
     * input: a user's roles are themselves derived from the (tenant, user) rows this entry is
     * keyed by, so two callers presenting different role sets for the same user are not two
     * legitimate answers — one of them is stale. Both mutation paths evict, which is what makes
     * the omission safe rather than merely convenient:
     * {@code RoleManagementService.assignRolesToUser} (explicit roles) evicts all entries, and
     * {@code ImplicitRoleEngine.recompute} (implicit roles) evicts this user's two entries via
     * {@link PermissionCacheEvictor}. Including the role codes in the key would instead leave a
     * revoked-role entry addressable under its old key, so eviction would have to enumerate
     * every historical role combination. Pinned by {@code PermissionScopeCacheTest}.</p>
     */
    @Cacheable(
            value = CacheConfig.ROLE_PERMISSIONS,
            // Prefix mirrors SecurityService.USER_PERMISSION_SCOPES_KEY_PREFIX; PermissionCacheEvictor
            // builds the identical key via userPermissionScopesCacheKey(tenantId, userId).
            key = "'permissionScopes:' + #root.target.userCacheKey(#userId)",
            condition = "#root.target.isTenantContextPresent()"
    )
    @Transactional(readOnly = true)
    public Map<String, com.nulogic.domain.user.RoleScope> getCachedPermissionScopesForUser(
            UUID userId, Collection<String> explicitRoleCodes) {
        Map<String, com.nulogic.domain.user.RoleScope> scopes = new HashMap<>();
        UUID tenantId = TenantContext.getCurrentTenant();

        if (tenantId == null || userId == null) {
            log.warn("getCachedPermissionScopesForUser called without TenantContext or userId; returning empty permissions");
            return scopes;
        }

        List<Role> allTenantRoles = roleRepository.findByTenantIdWithPermissions(tenantId);
        Map<UUID, Role> roleMap = new HashMap<>();
        for (Role r : allTenantRoles) {
            roleMap.put(r.getId(), r);
        }

        if (explicitRoleCodes != null && !explicitRoleCodes.isEmpty()) {
            List<Role> explicitRoles = roleRepository.findByCodeInAndTenantId(explicitRoleCodes, tenantId);
            for (Role role : explicitRoles) {
                flattenRolePermissionScopes(role, roleMap, scopes);
            }
        }

        List<ImplicitUserRole> implicitRoles = implicitUserRoleRepository
                .findByUserIdAndTenantIdAndIsActiveTrue(userId, tenantId);
        for (ImplicitUserRole implicitRole : implicitRoles) {
            Role role = roleMap.get(implicitRole.getRoleId());
            if (role != null) {
                flattenRolePermissionScopes(role, roleMap, scopes);
            }
        }

        log.debug("getCachedPermissionScopesForUser: user={}, explicitRoles={}, implicitRoles={}, totalPermissions={}",
                userId, explicitRoleCodes, implicitRoles.size(), scopes.size());

        return scopes;
    }

    /** Scope-preserving variant of {@link #flattenRolePermissions(Role, Map)}. */
    private void flattenRolePermissionScopes(Role role,
                                             Map<UUID, Role> roleMap,
                                             Map<String, com.nulogic.domain.user.RoleScope> out) {
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

            if (current.getPermissions() != null) {
                for (RolePermission rp : current.getPermissions()) {
                    mergeScope(out, rp.getPermission().getCode(), rp.getScope());
                }
            }

            if (current.getParentRoleId() != null) {
                Role parent = roleMap.get(current.getParentRoleId());
                if (parent != null) {
                    toProcess.offer(parent);
                }
            }
            depth++;
        }
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

    /**
     * Used by the {@code @Cacheable} condition SpEL expression.
     */
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
     * <p>
     * Cache key: "permissions:{tenantId}:{userId}"
     * TTL: 5 minutes (short-lived, user-specific)
     * <p>
     * Algorithm:
     * 1. Load explicit role permissions from provided role codes
     * 2. Walk parent_role_id chain for each explicit role (max depth 10, cycle detection)
     * 3. Load active implicit roles for the user
     * 4. Walk parent chain for each implicit role's role
     * 5. Merge all permissions additively into a Set<String>
     *
     * @param userId            UUID of the user (from JWT)
     * @param explicitRoleCodes Collection of explicit role codes (from JWT)
     * @return Set of permission codes (database format: "module.action")
     */
    @Cacheable(
            value = CacheConfig.ROLE_PERMISSIONS,
            // Prefix mirrors SecurityService.USER_PERMISSIONS_KEY_PREFIX; PermissionCacheEvictor
            // builds the identical key via userPermissionsCacheKey(tenantId, userId).
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
     * <p>
     * Uses a pre-loaded in-memory roleMap to avoid any DB queries during hierarchy walks.
     * The caller is responsible for loading all tenant roles once via
     * {@code roleRepository.findByTenantIdWithPermissions(tenantId)}.
     *
     * @param role    The role to start from
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
        return userCacheKey(TenantContext.getCurrentTenant(), userId);
    }

    /**
     * Tenant-explicit form of {@link #userCacheKey(UUID)}.
     *
     * <p>Static, and the single definition of the user-keyed cache-key format, so that an
     * eviction path can build the exact key {@code @Cacheable} produced without re-deriving
     * the format. {@link PermissionCacheEvictor} is the only other caller.</p>
     */
    public static String userCacheKey(UUID tenantId, UUID userId) {
        if (tenantId == null) {
            return "NO_TENANT::" + userId;
        }
        return tenantId + ":" + userId;
    }

    /** Prefix of the {@link #getCachedPermissionsForUser} entry (permission codes only). */
    public static final String USER_PERMISSIONS_KEY_PREFIX = "permissions:";

    /** Prefix of the {@link #getCachedPermissionScopesForUser} entry (code -> scope). */
    public static final String USER_PERMISSION_SCOPES_KEY_PREFIX = "permissionScopes:";

    /** The exact {@code rolePermissions} key holding this user's permission codes. */
    public static String userPermissionsCacheKey(UUID tenantId, UUID userId) {
        return USER_PERMISSIONS_KEY_PREFIX + userCacheKey(tenantId, userId);
    }

    /** The exact {@code rolePermissions} key holding this user's permission scopes. */
    public static String userPermissionScopesCacheKey(UUID tenantId, UUID userId) {
        return USER_PERMISSION_SCOPES_KEY_PREFIX + userCacheKey(tenantId, userId);
    }

    // Check if user is the current employee
    public boolean isCurrentEmployee(Authentication authentication, String employeeId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId() != null && userPrincipal.getId().toString().equals(employeeId);
        }
        return false;
    }
}
