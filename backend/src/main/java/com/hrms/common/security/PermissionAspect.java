package com.hrms.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * AOP Aspect for enforcing @RequiresPermission annotations.
 *
 * <p>This aspect intercepts all methods annotated with @RequiresPermission
 * and validates that the current user has the required permissions.</p>
 *
 * <p>When {@code revalidate = true}, permissions are fetched directly from the
 * database instead of trusting JWT claims. This provides defence against stale
 * JWT permissions on sensitive operations like payroll or admin actions.</p>
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class PermissionAspect {

    private final SecurityService securityService;

    /**
     * Intercepts methods with @RequiresPermission annotation and enforces permission checks
     *
     * @param joinPoint The intercepted method
     * @return The result of the method execution if permissions are satisfied
     * @throws Throwable If permission check fails or method execution throws an exception
     */
    @Around("@annotation(com.hrms.common.security.RequiresPermission)")
    public Object checkPermission(ProceedingJoinPoint joinPoint) throws Throwable {

        // Admin bypass: skip all permission evaluation for TENANT_ADMIN and SUPER_ADMIN users.
        // SecurityContext.isTenantAdmin() returns true for both TENANT_ADMIN and SUPER_ADMIN
        // roles, matching the frontend usePermissions.ts behavior that treats both as full admin.
        if (SecurityContext.isTenantAdmin()) {
            log.debug("Admin bypass — skipping @RequiresPermission check for method: {}",
                    ((MethodSignature) joinPoint.getSignature()).getMethod().getName());
            return joinPoint.proceed();
        }

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
        boolean revalidate = requiresPermission.revalidate();

        // If revalidate is true, fetch permissions from DB instead of JWT
        if (revalidate) {
            return checkPermissionWithRevalidation(joinPoint, method, anyOfPermissions, allOfPermissions);
        }

        // Standard JWT-based permission check
        log.debug("Permission check for method: {} - User permissions: {}, AppCode: {}",
                method.getName(), SecurityContext.getCurrentPermissions(), SecurityContext.getCurrentAppCode());

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

    /**
     * Performs permission check with fresh DB lookup instead of JWT claims.
     * Used for sensitive operations where stale permissions could cause damage.
     */
    private Object checkPermissionWithRevalidation(
            ProceedingJoinPoint joinPoint,
            Method method,
            String[] anyOfPermissions,
            String[] allOfPermissions
    ) throws Throwable {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Not authenticated");
        }

        // Extract role codes from the authentication
        Collection<String> roleCodes = auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toSet());

        // Fetch fresh permissions from database (bypasses cache)
        Set<String> freshPermissions = securityService.getFreshPermissions(roleCodes);

        log.info("[Revalidation] Fresh permission check for method: {} - DB permissions: {} ({})",
                method.getName(), freshPermissions.size(), roleCodes);

        // Validate OR logic
        if (anyOfPermissions.length > 0) {
            boolean hasAny = Arrays.stream(anyOfPermissions).anyMatch(freshPermissions::contains);
            if (!hasAny) {
                log.warn("[Revalidation] Access denied - User lacks required permissions (ANY OF: {}) " +
                        "for method: {}. Fresh DB permissions: {}",
                        Arrays.toString(anyOfPermissions), method.getName(), freshPermissions);
                throw new AccessDeniedException(
                        "Insufficient permissions (revalidated). Required any of: " + Arrays.toString(anyOfPermissions)
                );
            }
        }

        // Validate AND logic
        if (allOfPermissions.length > 0) {
            boolean hasAll = Arrays.stream(allOfPermissions).allMatch(freshPermissions::contains);
            if (!hasAll) {
                log.warn("[Revalidation] Access denied - User lacks required permissions (ALL OF: {}) " +
                        "for method: {}. Fresh DB permissions: {}",
                        Arrays.toString(allOfPermissions), method.getName(), freshPermissions);
                throw new AccessDeniedException(
                        "Insufficient permissions (revalidated). Required all of: " + Arrays.toString(allOfPermissions)
                );
            }
        }

        return joinPoint.proceed();
    }
}
