package com.hrms.common.security;

import com.hrms.application.featureflag.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * AOP Aspect for enforcing @RequiresFeature annotations
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class FeatureFlagAspect {

    private final FeatureFlagService featureFlagService;

    @Around("@annotation(com.hrms.common.security.RequiresFeature) || @within(com.hrms.common.security.RequiresFeature)")
    public Object checkFeature(ProceedingJoinPoint joinPoint) throws Throwable {
        // BUG-011 FIX: SuperAdmin bypass — skip feature flag checks entirely.
        // Per CLAUDE.md: "SuperAdmin Role automatically bypasses ALL RBAC permission checks."
        // Feature flags are an extension of access control, so SuperAdmin should bypass them too.
        if (SecurityContext.isSuperAdmin()) {
            log.debug("SuperAdmin bypass — skipping @RequiresFeature check for method: {}",
                    ((MethodSignature) joinPoint.getSignature()).getMethod().getName());
            return joinPoint.proceed();
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();

        // Check method first, then class
        RequiresFeature requiresFeature = method.getAnnotation(RequiresFeature.class);
        if (requiresFeature == null) {
            requiresFeature = joinPoint.getTarget().getClass().getAnnotation(RequiresFeature.class);
        }

        if (requiresFeature != null) {
            String featureKey = requiresFeature.value();
            if (!featureFlagService.isFeatureEnabled(featureKey)) {
                log.warn("Access denied - Feature '{}' is not enabled for tenant {}",
                        featureKey, SecurityContext.getCurrentTenantId());
                throw new AccessDeniedException("This feature is not enabled for your organization.");
            }
            log.debug("Feature check passed for '{}'", featureKey);
        }

        return joinPoint.proceed();
    }
}
