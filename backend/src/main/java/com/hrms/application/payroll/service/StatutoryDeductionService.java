package com.hrms.application.payroll.service;

import com.hrms.application.payroll.dto.StatutoryDeductions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

/**
 * Calculates India-specific statutory deductions for a single payroll period.
 *
 * <p>Covered components:
 * <ul>
 *   <li>PF  — Provident Fund (EPF) under The Employees' Provident Funds Act, 1952</li>
 *   <li>ESI — Employee State Insurance under The ESI Act, 1948</li>
 *   <li>PT  — Professional Tax (state-wise slabs)</li>
 *   <li>TDS — Tax Deducted at Source, New Regime slabs FY 2024-25</li>
 * </ul>
 *
 * <p>All monetary arithmetic uses {@link RoundingMode#HALF_UP} and is expressed in INR.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StatutoryDeductionService {

    // ─── PF constants ─────────────────────────────────────────────────────────
    /** PF wage ceiling (₹15,000/month) above which employer contribution is capped. */
    private static final BigDecimal PF_WAGE_CEILING = new BigDecimal("15000");
    /** PF contribution rate: 12% for both employee and employer. */
    private static final BigDecimal PF_RATE = new BigDecimal("0.12");
    /** Maximum employer PF contribution = 12% of ₹15,000 = ₹1,800. */
    private static final BigDecimal EMPLOYER_PF_MAX = new BigDecimal("1800");

    // ─── ESI constants ────────────────────────────────────────────────────────
    /** ESI applicability ceiling: gross salary must be ≤ ₹21,000/month. */
    private static final BigDecimal ESI_GROSS_CEILING = new BigDecimal("21000");
    /** Employee ESI rate: 0.75% of gross salary. */
    private static final BigDecimal ESI_EMPLOYEE_RATE = new BigDecimal("0.0075");
    /** Employer ESI rate: 3.25% of gross salary. */
    private static final BigDecimal ESI_EMPLOYER_RATE = new BigDecimal("0.0325");

    // ─── TDS / New Tax Regime slab boundaries (annual, INR) ──────────────────
    private static final BigDecimal SLAB_3L  = new BigDecimal("300000");
    private static final BigDecimal SLAB_6L  = new BigDecimal("600000");
    private static final BigDecimal SLAB_9L  = new BigDecimal("900000");
    private static final BigDecimal SLAB_12L = new BigDecimal("1200000");
    private static final BigDecimal SLAB_15L = new BigDecimal("1500000");

    private static final BigDecimal MONTHS_IN_YEAR = new BigDecimal("12");

    // ─── Professional Tax state-specific constants ────────────────────────────
    private static final BigDecimal PT_KA_THRESHOLD = new BigDecimal("15000");
    private static final BigDecimal PT_KA_AMOUNT    = new BigDecimal("200");
    private static final BigDecimal PT_TN_AMOUNT    = new BigDecimal("208");

    // Maharashtra MH slabs (monthly salary → PT amount)
    private static final BigDecimal MH_SLAB_1 = new BigDecimal("7500");
    private static final BigDecimal MH_SLAB_2 = new BigDecimal("10000");
    private static final BigDecimal MH_PT_1   = new BigDecimal("175");
    private static final BigDecimal MH_PT_2   = new BigDecimal("200");

    /**
     * Calculates all India statutory deductions for the given employee and salary inputs.
     *
     * @param employeeId  UUID of the employee (carried through to the result DTO)
     * @param basicSalary monthly basic salary in INR
     * @param grossSalary monthly gross salary (basic + all allowances) in INR
     * @param state       Indian state name (Karnataka, Maharashtra, Tamil Nadu, or others)
     * @return a fully populated {@link StatutoryDeductions} DTO
     */
    @Transactional(readOnly = true)
    public StatutoryDeductions calculate(
            UUID employeeId,
            BigDecimal basicSalary,
            BigDecimal grossSalary,
            String state) {

        log.debug("Calculating statutory deductions: employeeId={}, basic={}, gross={}, state={}",
                employeeId, basicSalary, grossSalary, state);

        BigDecimal employeePf  = calculateEmployeePf(basicSalary);
        BigDecimal employerPf  = calculateEmployerPf(basicSalary);
        BigDecimal employeeEsi = calculateEmployeeEsi(grossSalary);
        BigDecimal employerEsi = calculateEmployerEsi(grossSalary);
        BigDecimal pt          = calculateProfessionalTax(grossSalary, state);
        BigDecimal tds         = calculateMonthlyTds(grossSalary);

        BigDecimal totalEmployee = employeePf
                .add(employeeEsi)
                .add(pt)
                .add(tds)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalEmployer = employerPf
                .add(employerEsi)
                .setScale(2, RoundingMode.HALF_UP);

        return StatutoryDeductions.builder()
                .employeeId(employeeId)
                .employeePf(employeePf)
                .employerPf(employerPf)
                .employeeEsi(employeeEsi)
                .employerEsi(employerEsi)
                .professionalTax(pt)
                .tdsMonthly(tds)
                .totalEmployeeDeductions(totalEmployee)
                .totalEmployerContributions(totalEmployer)
                .build();
    }

    // ─── PF ──────────────────────────────────────────────────────────────────

    /**
     * Employee PF = 12% of actual basic salary (no ceiling on employee side).
     */
    private BigDecimal calculateEmployeePf(BigDecimal basicSalary) {
        return basicSalary.multiply(PF_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Employer PF = 12% of basic salary, capped at ₹1,800 when basic > ₹15,000.
     */
    private BigDecimal calculateEmployerPf(BigDecimal basicSalary) {
        if (basicSalary.compareTo(PF_WAGE_CEILING) > 0) {
            return EMPLOYER_PF_MAX;
        }
        return basicSalary.multiply(PF_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    // ─── ESI ─────────────────────────────────────────────────────────────────

    /**
     * Employee ESI = 0.75% of gross salary, only if gross ≤ ₹21,000.
     */
    private BigDecimal calculateEmployeeEsi(BigDecimal grossSalary) {
        if (grossSalary.compareTo(ESI_GROSS_CEILING) > 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return grossSalary.multiply(ESI_EMPLOYEE_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Employer ESI = 3.25% of gross salary, only if gross ≤ ₹21,000.
     */
    private BigDecimal calculateEmployerEsi(BigDecimal grossSalary) {
        if (grossSalary.compareTo(ESI_GROSS_CEILING) > 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return grossSalary.multiply(ESI_EMPLOYER_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    // ─── Professional Tax ────────────────────────────────────────────────────

    /**
     * Returns monthly professional tax based on state-specific slabs.
     *
     * <ul>
     *   <li><b>Karnataka</b>: ₹200/month if gross &gt; ₹15,000, else ₹0</li>
     *   <li><b>Maharashtra</b>: ₹0 if gross ≤ ₹7,500; ₹175 if ≤ ₹10,000; ₹200 above</li>
     *   <li><b>Tamil Nadu</b>: ₹208/month (flat, for all earning employees)</li>
     *   <li><b>Others</b>: ₹0 (configurable in future)</li>
     * </ul>
     */
    private BigDecimal calculateProfessionalTax(BigDecimal grossSalary, String state) {
        if (state == null || state.isBlank()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return switch (state.trim().toUpperCase()) {
            case "KARNATAKA", "KA" -> grossSalary.compareTo(PT_KA_THRESHOLD) > 0
                    ? PT_KA_AMOUNT.setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            case "MAHARASHTRA", "MH" -> calculateMaharashtraPt(grossSalary);

            case "TAMIL NADU", "TN" -> PT_TN_AMOUNT.setScale(2, RoundingMode.HALF_UP);

            default -> BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        };
    }

    /**
     * Maharashtra professional tax slabs (monthly gross):
     * &lt;= ₹7,500   → ₹0
     * ₹7,501–₹10,000 → ₹175
     * &gt; ₹10,000  → ₹200
     */
    private BigDecimal calculateMaharashtraPt(BigDecimal grossSalary) {
        if (grossSalary.compareTo(MH_SLAB_1) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        } else if (grossSalary.compareTo(MH_SLAB_2) <= 0) {
            return MH_PT_1.setScale(2, RoundingMode.HALF_UP);
        } else {
            return MH_PT_2.setScale(2, RoundingMode.HALF_UP);
        }
    }

    // ─── TDS ─────────────────────────────────────────────────────────────────

    /**
     * Calculates monthly TDS using New Tax Regime slabs for FY 2024-25.
     *
     * <p>Projected annual income = grossSalary * 12 (simplified; assumes no HRA exemption
     * under the new regime). Tax is computed on the annual figure and divided by 12.
     *
     * <p>New Regime slabs (FY 2024-25):
     * <pre>
     *   Up to ₹3,00,000          — 0%
     *   ₹3,00,001 – ₹6,00,000   — 5%
     *   ₹6,00,001 – ₹9,00,000   — 10%
     *   ₹9,00,001 – ₹12,00,000  — 15%
     *   ₹12,00,001 – ₹15,00,000 — 20%
     *   Above ₹15,00,000         — 30%
     * </pre>
     *
     * Note: Rebate u/s 87A (income ≤ ₹7L → tax = 0) and surcharge/cess are intentionally
     * excluded here for simplicity; they can be layered in a future enhancement.
     */
    private BigDecimal calculateMonthlyTds(BigDecimal grossSalary) {
        BigDecimal annualIncome = grossSalary.multiply(MONTHS_IN_YEAR);
        BigDecimal annualTax    = computeNewRegimeTax(annualIncome);
        return annualTax.divide(MONTHS_IN_YEAR, 2, RoundingMode.HALF_UP);
    }

    /**
     * Computes annual income tax under the New Regime for FY 2024-25.
     */
    private BigDecimal computeNewRegimeTax(BigDecimal annualIncome) {
        if (annualIncome.compareTo(SLAB_3L) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal tax = BigDecimal.ZERO;

        // 5% on ₹3L–₹6L band
        if (annualIncome.compareTo(SLAB_3L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_6L).subtract(SLAB_3L);
            tax = tax.add(taxable.multiply(new BigDecimal("0.05")));
        }

        // 10% on ₹6L–₹9L band
        if (annualIncome.compareTo(SLAB_6L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_9L).subtract(SLAB_6L);
            tax = tax.add(taxable.multiply(new BigDecimal("0.10")));
        }

        // 15% on ₹9L–₹12L band
        if (annualIncome.compareTo(SLAB_9L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_12L).subtract(SLAB_9L);
            tax = tax.add(taxable.multiply(new BigDecimal("0.15")));
        }

        // 20% on ₹12L–₹15L band
        if (annualIncome.compareTo(SLAB_12L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_15L).subtract(SLAB_12L);
            tax = tax.add(taxable.multiply(new BigDecimal("0.20")));
        }

        // 30% above ₹15L
        if (annualIncome.compareTo(SLAB_15L) > 0) {
            BigDecimal taxable = annualIncome.subtract(SLAB_15L);
            tax = tax.add(taxable.multiply(new BigDecimal("0.30")));
        }

        return tax.setScale(2, RoundingMode.HALF_UP);
    }
}
