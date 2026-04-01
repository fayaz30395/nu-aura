package com.hrms.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.math.BigDecimal;

/**
 * Validator for GPS latitude coordinates.
 * Latitude must be between -90 and 90 degrees.
 */
public class LatitudeValidator implements ConstraintValidator<ValidLatitude, BigDecimal> {

    private static final BigDecimal MIN_LATITUDE = new BigDecimal("-90");
    private static final BigDecimal MAX_LATITUDE = new BigDecimal("90");

    @Override
    public boolean isValid(BigDecimal value, ConstraintValidatorContext context) {
        // Null values are handled by @NotNull if required
        if (value == null) {
            return true;
        }

        return value.compareTo(MIN_LATITUDE) >= 0 && value.compareTo(MAX_LATITUDE) <= 0;
    }
}
