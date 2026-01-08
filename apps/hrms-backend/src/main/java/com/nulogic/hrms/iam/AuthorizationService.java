package com.nulogic.hrms.iam;

import com.nulogic.hrms.iam.model.Permission;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.Role;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.iam.repo.UserRepository;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthorizationService {
    private final UserRepository userRepository;

    public AuthorizationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public void checkPermission(UUID userId, String module, String action, PermissionScope scope) {
        if (!hasPermission(userId, module, action, scope)) {
            throw new AccessDeniedException("Forbidden");
        }
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UUID userId, String module, String action, PermissionScope scope) {
        User user = loadUser(userId);

        for (Role role : user.getRoles()) {
            if ("SUPER_ADMIN".equals(role.getName())) {
                return true;
            }
            for (Permission permission : role.getPermissions()) {
                if (permission.getModule().equals(module)
                        && permission.getAction().equals(action)
                        && permission.getScope() == scope) {
                    return true;
                }
            }
        }

        return false;
    }

    @Transactional(readOnly = true)
    public PermissionScope resolveScope(UUID userId, String module, String action) {
        User user = loadUser(userId);
        if (user.getRoles().stream().anyMatch(role -> "SUPER_ADMIN".equals(role.getName()))) {
            return PermissionScope.ORG;
        }

        Set<PermissionScope> scopes = EnumSet.noneOf(PermissionScope.class);
        for (Role role : user.getRoles()) {
            for (Permission permission : role.getPermissions()) {
                if (permission.getModule().equals(module) && permission.getAction().equals(action)) {
                    scopes.add(permission.getScope());
                }
            }
        }

        if (scopes.isEmpty()) {
            throw new AccessDeniedException("Forbidden");
        }

        return highestScope(scopes);
    }

    @Transactional(readOnly = true)
    public Set<PermissionScope> allowedScopes(UUID userId, String module, String action) {
        User user = loadUser(userId);
        if (user.getRoles().stream().anyMatch(role -> "SUPER_ADMIN".equals(role.getName()))) {
            return EnumSet.allOf(PermissionScope.class);
        }

        Set<PermissionScope> scopes = EnumSet.noneOf(PermissionScope.class);
        for (Role role : user.getRoles()) {
            for (Permission permission : role.getPermissions()) {
                if (permission.getModule().equals(module) && permission.getAction().equals(action)) {
                    scopes.add(permission.getScope());
                }
            }
        }
        return scopes;
    }

    private User loadUser(UUID userId) {
        return userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new AccessDeniedException("Forbidden"));
    }

    private PermissionScope highestScope(Set<PermissionScope> scopes) {
        List<PermissionScope> order = List.of(
                PermissionScope.ORG,
                PermissionScope.DEPARTMENT,
                PermissionScope.TEAM,
                PermissionScope.SELF
        );
        return order.stream().filter(scopes::contains).findFirst()
                .orElseThrow(() -> new AccessDeniedException("Forbidden"));
    }
}
