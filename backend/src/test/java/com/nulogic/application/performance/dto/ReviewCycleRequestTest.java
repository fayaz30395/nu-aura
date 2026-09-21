package com.nulogic.application.performance.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ReviewCycleRequest bean validation")
class ReviewCycleRequestTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    @DisplayName("rejects endDate before startDate")
    void rejectsEndDateBeforeStartDate() {
        ReviewCycleRequest request = ReviewCycleRequest.builder()
                .startDate(LocalDate.of(2026, 6, 1))
                .endDate(LocalDate.of(2026, 1, 1))
                .build();

        Set<ConstraintViolation<ReviewCycleRequest>> violations = validator.validate(request);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("endDateValid"));
    }

    @Test
    @DisplayName("rejects selfReviewDeadline outside [startDate, endDate]")
    void rejectsSelfReviewDeadlineOutsideRange() {
        ReviewCycleRequest request = ReviewCycleRequest.builder()
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 6, 1))
                .selfReviewDeadline(LocalDate.of(2026, 7, 1))
                .build();

        Set<ConstraintViolation<ReviewCycleRequest>> violations = validator.validate(request);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("selfReviewDeadlineValid"));
    }

    @Test
    @DisplayName("rejects managerReviewDeadline before startDate")
    void rejectsManagerReviewDeadlineBeforeStart() {
        ReviewCycleRequest request = ReviewCycleRequest.builder()
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 6, 1))
                .managerReviewDeadline(LocalDate.of(2025, 12, 31))
                .build();

        Set<ConstraintViolation<ReviewCycleRequest>> violations = validator.validate(request);

        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("managerReviewDeadlineValid"));
    }

    @Test
    @DisplayName("accepts a valid cycle")
    void acceptsValidCycle() {
        ReviewCycleRequest request = ReviewCycleRequest.builder()
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 6, 1))
                .selfReviewDeadline(LocalDate.of(2026, 3, 1))
                .managerReviewDeadline(LocalDate.of(2026, 4, 1))
                .build();

        Set<ConstraintViolation<ReviewCycleRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }
}
