package com.hrms.common.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to enforce a feature flag check on a method or class.
 * If the feature is not enabled for the current tenant, the method call will
 * fail.
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresFeature {
    /**
     * The unique key of the feature flag to check.
     */
    String value();
}
