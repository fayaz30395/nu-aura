package com.hrms.common.security;

import com.hrms.common.config.CacheConfig;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.RolePermission;
import com.hrms.infrastructure.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service("securityService")
@RequiredArgsConstructor
public class SecurityService {

    private final RoleRepository roleRepository;

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
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
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

    /** Used by the {@code @Cacheable} condition SpEL expression. */
    public boolean isTenantContextPresent() {
        return TenantContext.getCurrentTenant() != null;
    }

    public String rolesCacheKey(Collection<String> roles) {
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            // Should never be reached when condition=isTenantContextPresent() is in effect,
            // but provide a safe non-null value as a defensive fallback.
            return "NO_TENANT::" + String.join(",", new java.util.TreeSet<>(roles));
        }
        java.util.TreeSet<String> sorted = new java.util.TreeSet<>(roles);
        return tenantId + "::" + String.join(",", sorted);
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
