package com.hrms.common.api;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an API endpoint as deprecated.
 *
 * <p>When applied to a controller method or class, the following response headers are added:</p>
 * <ul>
 *   <li>X-API-Deprecated: true</li>
 *   <li>X-API-Deprecation-Notice: {message}</li>
 *   <li>Sunset: {sunset date in RFC 7231 format}</li>
 * </ul>
 *
 * <p><strong>Example usage:</strong></p>
 * <pre>
 * {@code @Deprecated(
 *     since = "1.1",
 *     sunset = "2025-06-01",
 *     replacement = "/api/v2/employees",
 *     message = "Use the v2 employees API for improved filtering"
 * )}
 * {@code @GetMapping("/employees")}
 * public List<Employee> getEmployees() { ... }
 * </pre>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Deprecated {

    /**
     * Version in which this endpoint was deprecated.
     */
    String since();

    /**
     * Date after which this endpoint will be removed (ISO-8601 format: YYYY-MM-DD).
     * This date will be returned in the Sunset header.
     */
    String sunset() default "";

    /**
     * URL of the replacement endpoint, if available.
     */
    String replacement() default "";

    /**
     * Human-readable message explaining the deprecation and migration path.
     */
    String message() default "This endpoint is deprecated and will be removed in a future version.";

    /**
     * Whether to log warnings when this endpoint is accessed.
     */
    boolean logWarning() default true;
}
