package com.hrms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;

/**
 * AOP Aspect for enforcing @RequiresPermission annotations
 *
 * This aspect intercepts all methods annotated with @RequiresPermission
 * and validates that the current user has the required permissions.
 */
@Aspect
@Component
@Slf4j
public class PermissionAspect {

    /**
     * Intercepts methods with @RequiresPermission annotation and enforces permission checks
     *
     * @param joinPoint The intercepted method
     * @return The result of the method execution if permissions are satisfied
     * @throws Throwable If permission check fails or method execution throws an exception
     */
    @Around("@annotation(com.hrms.common.security.RequiresPermission)")
    public Object checkPermission(ProceedingJoinPoint joinPoint) throws Throwable {

        // Get the method being called
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();

        // Get the @RequiresPermission annotation
        RequiresPermission requiresPermission = method.getAnnotation(RequiresPermission.class);

        if (requiresPermission == null) {
            // This shouldn't happen, but just in case
            log.warn("@RequiresPermission annotation not found on method: {}", method.getName());
            return joinPoint.proceed();
        }

        // Get the required permissions
        String[] anyOfPermissions = requiresPermission.value();
        String[] allOfPermissions = requiresPermission.allOf();

        // Debug logging for permission troubleshooting
        log.debug("Permission check for method: {} - User permissions: {}, AppCode: {}",
                method.getName(), SecurityContext.getCurrentPermissions(), SecurityContext.getCurrentAppCode());

        // Check if user is system admin or super admin (bypass all checks)
        // This checks for SUPER_ADMIN role, legacy SYSTEM:ADMIN, and app-prefixed HRMS:SYSTEM:ADMIN
        if (SecurityContext.isSuperAdmin()) {
            log.debug("User is Super Admin - bypassing check for method: {}", method.getName());
            return joinPoint.proceed();
        }

        // Validate OR logic permissions (user needs ANY of these)
        if (anyOfPermissions.length > 0) {
            if (!SecurityContext.hasAnyPermission(anyOfPermissions)) {
                log.warn("Access denied - User lacks required permissions (ANY OF: {}) for method: {}. User has: {}",
                        Arrays.toString(anyOfPermissions), method.getName(), SecurityContext.getCurrentPermissions());
                throw new AccessDeniedException(
                        "Insufficient permissions. Required any of: " + Arrays.toString(anyOfPermissions)
                );
            }
            log.debug("Permission check passed (ANY OF: {}) for method: {}",
                    Arrays.toString(anyOfPermissions), method.getName());
        }

        // Validate AND logic permissions (user needs ALL of these)
        if (allOfPermissions.length > 0) {
            if (!SecurityContext.hasAllPermissions(allOfPermissions)) {
                log.warn("Access denied - User lacks required permissions (ALL OF: {}) for method: {}. User has: {}",
                        Arrays.toString(allOfPermissions), method.getName(), SecurityContext.getCurrentPermissions());
                throw new AccessDeniedException(
                        "Insufficient permissions. Required all of: " + Arrays.toString(allOfPermissions)
                );
            }
            log.debug("Permission check passed (ALL OF: {}) for method: {}",
                    Arrays.toString(allOfPermissions), method.getName());
        }

        // All permission checks passed - proceed with method execution
        return joinPoint.proceed();
    }
}
