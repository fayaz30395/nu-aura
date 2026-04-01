package com.hrms.api.expense.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MileagePolicyRequest(
        @NotBlank(message = "Policy name is required")
        @Size(max = 200, message = "Policy name cannot exceed 200 characters")
        String name,

        @NotNull(message = "Rate per km is required")
        @DecimalMin(value = "0.01", message = "Rate must be greater than 0")
        @Digits(integer = 4, fraction = 2, message = "Rate format is invalid")
        BigDecimal ratePerKm,

        @Digits(integer = 6, fraction = 2, message = "Max daily km format is invalid")
        BigDecimal maxDailyKm,

        @Digits(integer = 6, fraction = 2, message = "Max monthly km format is invalid")
        BigDecimal maxMonthlyKm,

        String vehicleRates,

        @NotNull(message = "Effective from date is required")
        LocalDate effectiveFrom,

        LocalDate effectiveTo
) {}
