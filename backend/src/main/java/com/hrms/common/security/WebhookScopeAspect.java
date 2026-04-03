package com.hrms.common.security;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Aspect that enforces webhook scope requirements for API key authenticated requests.
 *
 * <p>This aspect intercepts methods annotated with {@link RequiresWebhookScope} and
 * verifies that the current authentication (if API key-based) has the required scope.</p>
 *
 * <p>Authorization flow:</p>
 * <ol>
 *   <li>If not authenticated, reject with 401</li>
 *   <li>If authenticated via JWT with SYSTEM:ADMIN permission, allow</li>
 *   <li>If authenticated via API key, check for required scope(s)</li>
 *   <li>If scope check fails, reject with 403</li>
 * </ol>
 */
@Aspect
@Component
@Order(1) // Run after authentication but before method execution
@Slf4j
public class WebhookScopeAspect {

    private static final String SYSTEM_ADMIN_PERMISSION = "HRMS:SYSTEM:ADMIN";
    private static final String API_KEY_PRINCIPAL_PREFIX = "api-key:";

    @Around("@annotation(requiresWebhookScope)")
    public Object checkWebhookScope(ProceedingJoinPoint joinPoint, RequiresWebhookScope requiresWebhookScope) throws Throwable {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("Unauthenticated access attempt to webhook endpoint");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        String principal = authentication.getName();
        String[] requiredScopes = requiresWebhookScope.value();

        // Check if this is API key authentication
        if (principal != null && principal.startsWith(API_KEY_PRINCIPAL_PREFIX)) {
            return handleApiKeyAuthentication(joinPoint, authentication, requiredScopes);
        }

        // For JWT authentication, check for SYSTEM:ADMIN permission
        return handleJwtAuthentication(joinPoint, authentication, requiredScopes);
    }

    private Object handleApiKeyAuthentication(ProceedingJoinPoint joinPoint, Authentication authentication,
                                              String[] requiredScopes) throws Throwable {
        // Get scopes from authentication details
        Object details = authentication.getDetails();
        if (!(details instanceof ApiKeyAuthenticationFilter.ApiKeyAuthenticationDetails apiKeyDetails)) {
            log.error("API key authentication missing details");
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Authentication details missing");
        }

        Set<String> grantedScopes = apiKeyDetails.scopes();

        // Check if any required scope is satisfied
        boolean hasRequiredScope = Arrays.stream(requiredScopes)
                .anyMatch(required -> WebhookScopes.hasAnyScope(grantedScopes, required));

        if (!hasRequiredScope) {
            String methodName = getMethodName(joinPoint);
            log.warn("API key lacks required scope(s) {} for method: {}. Granted scopes: {}",
                    Arrays.toString(requiredScopes), methodName, grantedScopes);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Insufficient scope. Required: " + Arrays.toString(requiredScopes));
        }

        log.debug("API key scope check passed for scopes: {}", Arrays.toString(requiredScopes));
        return joinPoint.proceed();
    }

    private Object handleJwtAuthentication(ProceedingJoinPoint joinPoint, Authentication authentication,
                                           String[] requiredScopes) throws Throwable {
        // For JWT auth, check if user has SYSTEM:ADMIN permission
        Set<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        // Check for system admin permission (grants all webhook access)
        boolean isSystemAdmin = authorities.contains(SYSTEM_ADMIN_PERMISSION) ||
                authorities.contains("ROLE_" + SYSTEM_ADMIN_PERMISSION) ||
                authorities.contains("PERMISSION_" + SYSTEM_ADMIN_PERMISSION);

        if (!isSystemAdmin) {
            // Also check for the scopes directly (in case JWT has scope-based authorities)
            boolean hasRequiredAuthority = Arrays.stream(requiredScopes)
                    .anyMatch(scope -> authorities.contains("SCOPE_" + scope) ||
                            authorities.contains(scope));

            if (!hasRequiredAuthority) {
                String methodName = getMethodName(joinPoint);
                log.warn("User lacks SYSTEM:ADMIN permission or required scopes {} for method: {}",
                        Arrays.toString(requiredScopes), methodName);
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied. Requires SYSTEM:ADMIN permission or webhook scopes.");
            }
        }

        log.debug("JWT authorization passed for webhook endpoint");
        return joinPoint.proceed();
    }

    private String getMethodName(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        return signature.getDeclaringType().getSimpleName() + "." + signature.getName();
    }
}
