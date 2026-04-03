package com.hrms.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Slf4j
@Component
@RequiredArgsConstructor
public class CustomPermissionEvaluator implements PermissionEvaluator {

    private final SecurityService securityService;

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (!isAuthenticated(authentication) || permission == null) {
            return false;
        }

        if (isSuperAdmin(authentication)) {
            return true;
        }

        return securityService.hasPermission(authentication, permission.toString());
    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType,
                                 Object permission) {
        if (!isAuthenticated(authentication) || permission == null) {
            return false;
        }

        if (isSuperAdmin(authentication)) {
            return true;
        }

        return securityService.hasPermission(authentication, permission.toString());
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated();
    }

    private boolean isSuperAdmin(Authentication authentication) {
        return SecurityContext.isSuperAdmin();
    }
}
