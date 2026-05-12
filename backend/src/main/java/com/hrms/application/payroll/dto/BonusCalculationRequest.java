package com.hrms.application.payroll.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * F1.12 — Inbound request for a Payment of Bonus Act 1965 calculation.
 *
 * <p>All wage figures are monthly amounts in INR. {@code daysWorkedInFy} is the
 * count of qualifying days worked by the employee in the bonus accounting year
 * (April–March), used to pro-rate the annual bonus for partial-year service.
 *
 * @see com.hrms.application.payroll.service.BonusCalculationService
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BonusCalculationRequest {

    /**
     * Employee whose bonus is being computed. Carried through to the response DTO
     * for traceability; the service itself is stateless w.r.t. the employee record.
     */
    @NotNull(message = "employeeId is required")
    private UUID employeeId;

    /**
     * Monthly basic salary (and DA, if separately tracked, callers may pass basic + DA).
     * Used to evaluate the §1(3)(ii) eligibility ceiling (₹21,000) and is capped at
     * the §12 statutory basic ceiling (₹7,000) for the actual bonus computation.
     */
    @NotNull(message = "monthlyBasic is required")
    @DecimalMin(value = "0.00", message = "monthlyBasic must be non-negative")
    @Digits(integer = 12, fraction = 2, message = "monthlyBasic has at most 2 decimal places")
    private BigDecimal monthlyBasic;

    /**
     * Optional bonus rate (decimal, e.g. {@code 0.0833} for 8.33% or {@code 0.20} for 20%).
     * When {@code null} the service applies the statutory minimum of 8.33% per §10.
     * Callers may pass any rate between the §10 minimum (8.33%) and §11 maximum (20%);
     * out-of-band values are clamped by the service to remain Act-compliant.
     */
    @DecimalMin(value = "0.0833", message = "bonusRate must be at least the §10 statutory minimum (0.0833)")
    @DecimalMax(value = "0.20", message = "bonusRate must not exceed the §11 statutory maximum (0.20)")
    @Digits(integer = 1, fraction = 4, message = "bonusRate has at most 4 decimal places")
    private BigDecimal bonusRate;

    /**
     * Number of qualifying days the employee worked in the Indian fiscal year
     * (April 1 – March 31). Used to pro-rate the annual bonus per §13.
     * Must be 0–366 inclusive (366 covers leap-year fiscals).
     */
    @PositiveOrZero(message = "daysWorkedInFy must be non-negative")
    @Min(value = 0, message = "daysWorkedInFy must be at least 0")
    @Max(value = 366, message = "daysWorkedInFy cannot exceed 366")
    private long daysWorkedInFy;
}
