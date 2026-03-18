package com.hrms.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Validates that a date range is valid (endDate >= startDate).
 * Apply to a class containing startDate and endDate fields.
 *
 * <p>Usage example:
 * <pre>
 * {@code @DateRangeValid(startDateField = "startDate", endDateField = "endDate")}
 * public class MyRequest {
 *     private LocalDate startDate;
 *     private LocalDate endDate;
 * }
 * </pre>
 */
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = DateRangeValidator.class)
@Documented
public @interface DateRangeValid {

    String message() default "End date must be on or after start date";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    /**
     * Name of the start date field
     */
    String startDateField() default "startDate";

    /**
     * Name of the end date field
     */
    String endDateField() default "endDate";

    /**
     * If true, allows null values for either field (validation passes).
     * If false, both fields must be non-null for validation to pass.
     */
    boolean allowNullDates() default true;
}
