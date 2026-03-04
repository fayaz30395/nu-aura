package com.hrms.common.security;

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
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        String email = authentication.getName();
        // Since roles might be in granted authorities, caching permissions by authority
        // (Role name or Role Id)
        Collection<String> authorities = authentication.getAuthorities().stream()
                .map(auth -> auth.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toSet());

        Set<String> userPermissions = getCachedPermissions(authorities);
        return userPermissions.contains(permissionCode);
    }

    @Cacheable(value = "rolePermissions", key = "#roles.toString()")
    public Set<String> getCachedPermissions(Collection<String> roles) {
        Set<String> permissions = new HashSet<>();
        List<Role> activeRoles = roleRepository.findByNameIn(roles);
        for (Role role : activeRoles) {
            if (role.getRolePermissions() != null) {
                for (RolePermission rp : role.getRolePermissions()) {
                    permissions.add(rp.getPermission().getCode());
                }
            }
        }
        return permissions;
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
