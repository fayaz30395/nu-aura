package com.nulogic.common.security;

import java.lang.annotation.*;

/**
 * Annotation to mark methods/classes that require specific permissions
 * Usage: @RequiresPermission(Permission.EMPLOYEE_READ)
 *
 * This annotation is shared across all modules and processed by the
 * PermissionAspect in the main application.
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
}
