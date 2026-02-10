package com.hrms.common.logging;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog.AuditAction;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.UUID;

/**
 * Aspect for auditing service method calls.
 * Logs method entry, exit, duration, and any exceptions.
 *
 * <p>
 * Supports both automatic logging and declarative @Audited annotation.
 * </p>
 */
@Aspect
@Component
@Slf4j
public class AuditLogAspect {

    private AuditLogService auditLogService;

    @Autowired
    @Lazy
    public void setAuditLogService(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

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
                    if (arg == null)
                        return "null";
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

    /**
     * Handle methods annotated with @Audited for declarative audit logging.
     */
    @Around("@annotation(com.hrms.common.logging.Audited)")
    public Object handleAuditedAnnotation(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Audited audited = method.getAnnotation(Audited.class);

        if (audited == null) {
            return joinPoint.proceed();
        }

        Object result = null;
        Exception caughtException = null;

        try {
            result = joinPoint.proceed();
        } catch (Exception e) {
            caughtException = e;
            if (!audited.logOnException()) {
                throw e;
            }
        }

        // Create audit log entry
        try {
            UUID entityId = extractEntityId(joinPoint, result, audited);
            String description = audited.description().isEmpty() ? null : audited.description();

            if (entityId != null && auditLogService != null) {
                auditLogService.logAction(
                        audited.entityType(),
                        entityId,
                        audited.action(),
                        null, // Old value not captured (requires entity lookup)
                        result,
                        description);
            }
        } catch (Exception e) {
            log.warn("Failed to create audit log for @Audited method: {}", e.getMessage());
        }

        if (caughtException != null) {
            throw caughtException;
        }

        return result;
    }

    /**
     * Extract entity ID from method parameters or return value.
     */
    private UUID extractEntityId(ProceedingJoinPoint joinPoint, Object result, Audited audited) {
        // Try to get from specified parameter
        if (audited.entityIdParam() >= 0) {
            Object[] args = joinPoint.getArgs();
            if (args.length > audited.entityIdParam()) {
                Object arg = args[audited.entityIdParam()];
                if (arg instanceof UUID) {
                    return (UUID) arg;
                }
                if (arg instanceof String) {
                    try {
                        return UUID.fromString((String) arg);
                    } catch (IllegalArgumentException e) {
                        // Not a valid UUID string
                    }
                }
            }
        }

        // Try to extract from return value
        if (result != null) {
            // Try getId() method
            try {
                java.lang.reflect.Method getIdMethod = result.getClass().getMethod("getId");
                Object id = getIdMethod.invoke(result);
                if (id instanceof UUID) {
                    return (UUID) id;
                }
            } catch (Exception e) {
                // No getId() method or error
            }
        }

        return null;
    }
}
