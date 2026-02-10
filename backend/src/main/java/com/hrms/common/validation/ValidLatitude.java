package com.hrms.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

/**
 * Validates that a BigDecimal value is a valid GPS latitude coordinate.
 * Valid latitude values are between -90 and 90 degrees.
 */
@Documented
@Constraint(validatedBy = LatitudeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidLatitude {
    String message() default "Latitude must be between -90 and 90 degrees";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
