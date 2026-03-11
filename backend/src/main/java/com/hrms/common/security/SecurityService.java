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

    @Cacheable(value = CacheConfig.ROLE_PERMISSIONS, key = "#root.target.rolesCacheKey(#roles)")
    public Set<String> getCachedPermissions(Collection<String> roles) {
        Set<String> permissions = new HashSet<>();
        java.util.UUID tenantId = TenantContext.getCurrentTenant();
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

    public String rolesCacheKey(Collection<String> roles) {
        java.util.TreeSet<String> sorted = new java.util.TreeSet<>(roles);
        return TenantContext.getCurrentTenant() + "::" + String.join(",", sorted);
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
