package com.hrms.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.math.BigDecimal;

/**
 * Validator for GPS longitude coordinates.
 * Longitude must be between -180 and 180 degrees.
 */
public class LongitudeValidator implements ConstraintValidator<ValidLongitude, BigDecimal> {

    private static final BigDecimal MIN_LONGITUDE = new BigDecimal("-180");
    private static final BigDecimal MAX_LONGITUDE = new BigDecimal("180");

    @Override
    public boolean isValid(BigDecimal value, ConstraintValidatorContext context) {
        // Null values are handled by @NotNull if required
        if (value == null) {
            return true;
        }

        return value.compareTo(MIN_LONGITUDE) >= 0 && value.compareTo(MAX_LONGITUDE) <= 0;
    }
}
