package com.hrms.application.payroll.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * F1.12 — Outcome of a Payment of Bonus Act 1965 calculation.
 *
 * <p>{@link #bonusAmount} is the pro-rated annual bonus for the bonus accounting year
 * (April–March) in INR, rounded to 2 decimal places using {@code HALF_UP}.
 * {@link #eligible} reflects §1(3)(ii) wage-ceiling eligibility; {@link #reason}
 * is a human-readable explanation suitable for surfacing in HR tooling.
 *
 * @see com.hrms.application.payroll.service.BonusCalculationService
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BonusCalculationResponse {

    /**
     * Final pro-rated bonus amount in INR. Zero when the employee is ineligible
     * (e.g. monthly basic exceeds the ₹21,000 wage ceiling).
     */
    private BigDecimal bonusAmount;

    /**
     * True when the employee qualifies under §1(3)(ii) of the Act (basic ≤ ₹21,000/month).
     */
    private boolean eligible;

    /**
     * Human-readable justification for the eligibility decision and rate applied.
     * Examples: {@code "Eligible — pro-rated at 8.33% (§10 minimum)"} or
     * {@code "Employee earns above ₹21k ceiling — not eligible under §1(3)(ii)"}.
     */
    private String reason;
}
