package com.hrms.common.logging;

import com.hrms.common.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.UUID;

/**
 * Aspect for auditing service method calls.
 * Logs method entry, exit, duration, and any exceptions.
 */
@Aspect
@Component
@Slf4j
public class AuditLogAspect {

    /**
     * Logs all service layer method calls with timing information.
     */
    @Around("execution(* com.hrms.application..service.*.*(..))")
    public Object logServiceMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();

        String userId = getCurrentUserId();
        UUID tenantId = TenantContext.getCurrentTenant();

        long startTime = System.currentTimeMillis();

        if (log.isDebugEnabled()) {
            log.debug("AUDIT: Entering {}.{} - User: {} - Tenant: {} - Args: {}",
                    className, methodName, userId, tenantId,
                    sanitizeArgs(joinPoint.getArgs()));
        }

        try {
            Object result = joinPoint.proceed();

            long duration = System.currentTimeMillis() - startTime;

            if (log.isDebugEnabled()) {
                log.debug("AUDIT: Completed {}.{} - Duration: {}ms - User: {} - Tenant: {}",
                        className, methodName, duration, userId, tenantId);
            }

            // Log slow operations
            if (duration > 1000) {
                log.warn("SLOW_OPERATION: {}.{} took {}ms - User: {} - Tenant: {}",
                        className, methodName, duration, userId, tenantId);
            }

            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;

            log.error("AUDIT: Exception in {}.{} - Duration: {}ms - User: {} - Tenant: {} - Error: {}",
                    className, methodName, duration, userId, tenantId, e.getMessage());

            throw e;
        }
    }

    /**
     * Logs all controller method calls.
     */
    @Around("execution(* com.hrms.api..controller.*.*(..))")
    public Object logControllerMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();

        long startTime = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();

            long duration = System.currentTimeMillis() - startTime;

            if (duration > 500) {
                log.info("API: {}.{} completed in {}ms", className, methodName, duration);
            }

            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("API: {}.{} failed after {}ms - Error: {}",
                    className, methodName, duration, e.getMessage());
            throw e;
        }
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "anonymous";
    }

    private String sanitizeArgs(Object[] args) {
        if (args == null || args.length == 0) {
            return "[]";
        }

        return Arrays.stream(args)
                .map(arg -> {
                    if (arg == null) return "null";
                    String argStr = arg.toString();
                    // Mask sensitive data
                    if (argStr.toLowerCase().contains("password") ||
                        argStr.toLowerCase().contains("token") ||
                        argStr.toLowerCase().contains("secret")) {
                        return "[REDACTED]";
                    }
                    // Truncate long arguments
                    if (argStr.length() > 100) {
                        return argStr.substring(0, 100) + "...";
                    }
                    return argStr;
                })
                .toList()
                .toString();
    }
}
