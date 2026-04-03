package com.hrms.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * F-05: HandlerInterceptor that enforces @RequiresPermission BEFORE Spring's @Valid
 * argument resolution runs.
 *
 * <p><b>Why this is needed:</b> Spring MVC resolves controller method arguments
 * (including @Valid validation) inside {@code InvocableHandlerMethod.invokeForRequest()}
 * <em>before</em> the method is invoked through the Spring AOP proxy. This means
 * the existing {@link PermissionAspect} (which uses @Around AOP) fires <em>after</em>
 *
 * @Valid. Unauthorized users therefore receive HTTP 400 (validation failure) instead
 * of HTTP 403 (forbidden) when they send an invalid request body to a protected
 * endpoint — inadvertently exposing the API field structure.</p>
 *
 * <p>{@link HandlerInterceptor#preHandle} is called by {@code DispatcherServlet}
 * <em>before</em> {@code HandlerAdapter.handle()}, which is where argument resolution
 * occurs. Registering this interceptor ensures permission checks always happen first.</p>
 *
 * <p>The {@link PermissionAspect} is <em>retained</em> as a second layer of defence
 * for service-level method security (called internally between beans).</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PermissionHandlerInterceptor implements HandlerInterceptor {

    private final SecurityService securityService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true; // Static resources, non-controller handlers — let through
        }

        // Resolve @RequiresPermission: method-level takes precedence over class-level
        Method method = handlerMethod.getMethod();
        RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
        if (annotation == null) {
            annotation = handlerMethod.getBeanType().getAnnotation(RequiresPermission.class);
        }
        if (annotation == null) {
            return true; // No permission annotation — not a protected endpoint
        }

        // SUPER_ADMIN / TENANT_ADMIN bypass (mirrors PermissionAspect and frontend usePermissions.ts)
        if (SecurityContext.isTenantAdmin()) {
            log.debug("PermissionHandlerInterceptor: admin bypass for {}", method.getName());
            return true;
        }

        String[] anyOf = annotation.value();
        String[] allOf = annotation.allOf();

        if (anyOf.length == 0 && allOf.length == 0) {
            log.warn("PermissionHandlerInterceptor: @RequiresPermission on {} has no permissions defined — denying", method.getName());
            sendForbidden(response, "Invalid permission configuration on endpoint");
            return false;
        }

        boolean allowed = annotation.revalidate()
                ? checkWithRevalidation(method, anyOf, allOf)
                : checkFromSecurityContext(method, anyOf, allOf);

        if (!allowed) {
            sendForbidden(response, buildDeniedMessage(anyOf, allOf));
            return false;
        }

        return true;
    }

    private boolean checkFromSecurityContext(Method method, String[] anyOf, String[] allOf) {
        if (anyOf.length > 0 && !SecurityContext.hasAnyPermission(anyOf)) {
            log.warn("PermissionHandlerInterceptor: denied (ANY OF: {}) for {}", Arrays.toString(anyOf), method.getName());
            return false;
        }
        if (allOf.length > 0 && !SecurityContext.hasAllPermissions(allOf)) {
            log.warn("PermissionHandlerInterceptor: denied (ALL OF: {}) for {}", Arrays.toString(allOf), method.getName());
            return false;
        }
        return true;
    }

    private boolean checkWithRevalidation(Method method, String[] anyOf, String[] allOf) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        Collection<String> roleCodes = auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toSet());
        Set<String> freshPermissions = securityService.getFreshPermissions(roleCodes);

        if (anyOf.length > 0 && Arrays.stream(anyOf).noneMatch(freshPermissions::contains)) {
            log.warn("PermissionHandlerInterceptor: revalidation denied (ANY OF: {}) for {}", Arrays.toString(anyOf), method.getName());
            return false;
        }
        if (allOf.length > 0 && !Arrays.stream(allOf).allMatch(freshPermissions::contains)) {
            log.warn("PermissionHandlerInterceptor: revalidation denied (ALL OF: {}) for {}", Arrays.toString(allOf), method.getName());
            return false;
        }
        return true;
    }

    private void sendForbidden(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(String.format(
                "{\"status\":403,\"error\":\"Forbidden\",\"message\":\"%s\",\"timestamp\":\"%s\"}",
                message.replace("\"", "'"),
                Instant.now()));
    }

    private String buildDeniedMessage(String[] anyOf, String[] allOf) {
        if (anyOf.length > 0) {
            return "Insufficient permissions. Required any of: " + Arrays.toString(anyOf);
        }
        return "Insufficient permissions. Required all of: " + Arrays.toString(allOf);
    }
}
