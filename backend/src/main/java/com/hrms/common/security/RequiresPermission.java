package com.hrms.common.security;

import java.lang.annotation.*;

/**
 * Annotation to mark methods/classes that require specific permissions
 * Usage: @RequiresPermission(Permission.EMPLOYEE_READ)
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresPermission {
    /**
     * Required permissions (OR logic - user needs at least one)
     */
    String[] value() default {};

    /**
     * All required permissions (AND logic - user needs all)
     */
    String[] allOf() default {};

    /**
     * Error message when permission denied
     */
    String message() default "Access denied - insufficient permissions";

    /**
     * When true, forces a database lookup to re-validate the user's current
     * permissions instead of trusting JWT claims alone.
     *
     * <p>Use this on sensitive operations where stale JWT permissions could
     * cause damage (e.g., payroll processing, admin operations, role changes).
     * This adds ~1 DB query overhead but ensures the permission check reflects
     * the user's current role assignments, not just what was in the JWT at login.</p>
     *
     * <p>Example: {@code @RequiresPermission(value = "payroll.process", revalidate = true)}</p>
     */
    boolean revalidate() default false;
}
