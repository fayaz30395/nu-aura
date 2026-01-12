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
}
