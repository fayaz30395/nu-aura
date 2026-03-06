package com.hrms.application.payroll.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO representing India statutory deductions for a single payroll period.
 * All monetary values are in INR (Indian Rupees).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatutoryDeductions {

    /** The employee this calculation is for (informational, not persisted here). */
    private UUID employeeId;

    // ─── PF (Provident Fund) ─────────────────────────────────────────────────

    /**
     * Employee PF contribution: 12% of basic salary.
     * No wage ceiling on the employee side — always 12% of actual basic.
     */
    private BigDecimal employeePf;

    /**
     * Employer PF contribution: 12% of basic salary but capped at ₹1,800
     * (i.e. 12% of ₹15,000 wage ceiling) when basic exceeds ₹15,000.
     */
    private BigDecimal employerPf;

    // ─── ESI (Employee State Insurance) ──────────────────────────────────────

    /**
     * Employee ESI contribution: 0.75% of gross salary.
     * Only applicable when gross salary ≤ ₹21,000/month; otherwise zero.
     */
    private BigDecimal employeeEsi;

    /**
     * Employer ESI contribution: 3.25% of gross salary.
     * Only applicable when gross salary ≤ ₹21,000/month; otherwise zero.
     */
    private BigDecimal employerEsi;

    // ─── Professional Tax ─────────────────────────────────────────────────────

    /**
     * State-level professional tax (employee deduction).
     * Computed per state slab rules (Karnataka / Maharashtra / Tamil Nadu).
     */
    private BigDecimal professionalTax;

    // ─── TDS (Income Tax) ─────────────────────────────────────────────────────

    /**
     * Monthly TDS instalment based on projected annual income.
     * Uses New Tax Regime slabs for FY 2024-25.
     */
    private BigDecimal tdsMonthly;

    // ─── Totals ───────────────────────────────────────────────────────────────

    /**
     * Sum of all deductions borne by the employee:
     * employeePf + employeeEsi + professionalTax + tdsMonthly.
     */
    private BigDecimal totalEmployeeDeductions;

    /**
     * Sum of all contributions borne by the employer:
     * employerPf + employerEsi.
     */
    private BigDecimal totalEmployerContributions;
}
