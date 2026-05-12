package com.hrms.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Validator for {@link DateRangeValid} annotation.
 * Ensures end date is on or after start date.
 */
@Slf4j
public class DateRangeValidator implements ConstraintValidator<DateRangeValid, Object> {

    private String startDateField;
    private String endDateField;
    private boolean allowNullDates;

    @Override
    public void initialize(DateRangeValid constraintAnnotation) {
        this.startDateField = constraintAnnotation.startDateField();
        this.endDateField = constraintAnnotation.endDateField();
        this.allowNullDates = constraintAnnotation.allowNullDates();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }

        try {
            Object startValue = getFieldValue(value, startDateField);
            Object endValue = getFieldValue(value, endDateField);

            // Handle null values
            if (startValue == null || endValue == null) {
                return allowNullDates;
            }

            // Compare dates
            if (startValue instanceof LocalDate startDate && endValue instanceof LocalDate endDate) {
                boolean valid = !endDate.isBefore(startDate);
                if (!valid) {
                    addConstraintViolation(context, endDateField);
                }
                return valid;
            }

            if (startValue instanceof LocalDateTime startDateTime && endValue instanceof LocalDateTime endDateTime) {
                boolean valid = !endDateTime.isBefore(startDateTime);
                if (!valid) {
                    addConstraintViolation(context, endDateField);
                }
                return valid;
            }

            log.warn("DateRangeValidator: Unsupported date types {} and {}",
                    startValue.getClass().getName(), endValue.getClass().getName());
            return true;

        } catch (ReflectiveOperationException e) {
            log.error("DateRangeValidator: Error validating date range", e);
            return true; // Fail open on reflection errors
        }
    }

    private Object getFieldValue(Object object, String fieldName) throws ReflectiveOperationException {
        Class<?> clazz = object.getClass();
        while (clazz != null) {
            try {
                Field field = clazz.getDeclaredField(fieldName);
                field.setAccessible(true);
                return field.get(object);
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        throw new NoSuchFieldException("Field not found: " + fieldName);
    }

    private void addConstraintViolation(ConstraintValidatorContext context, String field) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode(field)
                .addConstraintViolation();
    }
}
