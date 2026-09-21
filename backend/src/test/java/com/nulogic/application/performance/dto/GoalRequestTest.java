package com.nulogic.application.performance.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GoalRequest bean validation")
class GoalRequestTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    @DisplayName("rejects negative targetValue")
    void rejectsNegativeTargetValue() {
        GoalRequest request = GoalRequest.builder().targetValue(new BigDecimal("-1")).build();

        Set<ConstraintViolation<GoalRequest>> violations = validator.validate(request);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("targetValue"));
    }

    @Test
    @DisplayName("rejects negative currentValue")
    void rejectsNegativeCurrentValue() {
        GoalRequest request = GoalRequest.builder().currentValue(new BigDecimal("-5")).build();

        Set<ConstraintViolation<GoalRequest>> violations = validator.validate(request);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("currentValue"));
    }

    @Test
    @DisplayName("rejects dueDate before startDate")
    void rejectsDueDateBeforeStartDate() {
        GoalRequest request = GoalRequest.builder()
                .startDate(LocalDate.of(2026, 6, 1))
                .dueDate(LocalDate.of(2026, 1, 1))
                .build();

        Set<ConstraintViolation<GoalRequest>> violations = validator.validate(request);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("dueDateValid"));
    }

    @Test
    @DisplayName("accepts valid request")
    void acceptsValidRequest() {
        GoalRequest request = GoalRequest.builder()
                .targetValue(new BigDecimal("100"))
                .currentValue(BigDecimal.ZERO)
                .startDate(LocalDate.of(2026, 1, 1))
                .dueDate(LocalDate.of(2026, 6, 1))
                .build();

        Set<ConstraintViolation<GoalRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }
}
