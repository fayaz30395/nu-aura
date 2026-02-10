package com.hrms.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

/**
 * Validates that a BigDecimal value is a valid GPS longitude coordinate.
 * Valid longitude values are between -180 and 180 degrees.
 */
@Documented
@Constraint(validatedBy = LongitudeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidLongitude {
    String message() default "Longitude must be between -180 and 180 degrees";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
