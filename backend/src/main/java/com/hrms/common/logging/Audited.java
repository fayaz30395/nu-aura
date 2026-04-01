package com.hrms.common.logging;

import com.hrms.domain.audit.AuditLog.AuditAction;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods for automatic audit logging.
 *
 * <p>When applied to a method, an audit log entry will be created
 * automatically when the method completes successfully.</p>
 *
 * <p><strong>Example usage:</strong></p>
 * <pre>
 * {@code @Audited(action = AuditAction.CREATE, entityType = "EMPLOYEE")}
 * public Employee createEmployee(CreateEmployeeRequest request) {
 *     // Method implementation
 * }
 * </pre>
 *
 * <p>The audit log will capture:</p>
 * <ul>
 *   <li>Entity type and ID (from return value or parameter)</li>
 *   <li>Action performed</li>
 *   <li>Actor (current user)</li>
 *   <li>Tenant context</li>
 *   <li>IP address and user agent</li>
 *   <li>Before/after values (if captureChanges = true)</li>
 * </ul>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audited {

    /**
     * The type of action being audited.
     */
    AuditAction action();

    /**
     * The entity type being audited (e.g., "EMPLOYEE", "LEAVE_REQUEST").
     */
    String entityType();

    /**
     * Optional description of the action.
     * Supports SpEL expressions for dynamic values.
     */
    String description() default "";

    /**
     * Whether to capture the before and after values.
     * Only applicable for UPDATE actions.
     */
    boolean captureChanges() default false;

    /**
     * Parameter index to use as entity ID (0-based).
     * If -1, will try to extract from return value.
     */
    int entityIdParam() default -1;

    /**
     * Whether to log even if the method throws an exception.
     */
    boolean logOnException() default false;
}
