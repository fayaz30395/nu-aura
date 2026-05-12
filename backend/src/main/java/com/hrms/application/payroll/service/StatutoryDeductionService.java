package com.hrms.application.payroll.service;

import com.hrms.application.payroll.dto.StatutoryDeductions;
import com.hrms.application.statutory.service.LWFService;
import com.hrms.domain.employee.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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

    /**
     * PF wage ceiling (₹15,000/month) above which employer contribution is capped.
     */
    private static final BigDecimal PF_WAGE_CEILING = new BigDecimal("15000");

    // ─── PF constants ─────────────────────────────────────────────────────────
    /**
     * PF contribution rate: 12% for both employee and employer.
     */
    private static final BigDecimal PF_RATE = new BigDecimal("0.12");
    /**
     * Maximum employer PF contribution = 12% of ₹15,000 = ₹1,800.
     */
    private static final BigDecimal EMPLOYER_PF_MAX = new BigDecimal("1800");
    /**
     * ESI applicability ceiling: gross salary must be ≤ ₹21,000/month.
     */
    private static final BigDecimal ESI_GROSS_CEILING = new BigDecimal("21000");

    // ─── ESI constants ────────────────────────────────────────────────────────
    /**
     * Employee ESI rate: 0.75% of gross salary.
     */
    private static final BigDecimal ESI_EMPLOYEE_RATE = new BigDecimal("0.0075");
    /**
     * Employer ESI rate: 3.25% of gross salary.
     */
    private static final BigDecimal ESI_EMPLOYER_RATE = new BigDecimal("0.0325");
    // ─── TDS / New Tax Regime slab boundaries (annual, INR) ──────────────────
    // BIZ-007: These slabs are for FY 2024-25 New Tax Regime. When slabs change,
    // create a DB-driven IncomeTaxSlab entity (similar to ProfessionalTaxSlab)
    // with fiscal_year, min_income, max_income, rate columns and a tenant-aware
    // repository. For now, these are correct for FY 2024-25.
    private static final BigDecimal SLAB_3L = new BigDecimal("300000");
    private static final BigDecimal SLAB_6L = new BigDecimal("600000");
    private static final BigDecimal SLAB_9L = new BigDecimal("900000");
    private static final BigDecimal SLAB_12L = new BigDecimal("1200000");
    private static final BigDecimal SLAB_15L = new BigDecimal("1500000");
    private static final BigDecimal MONTHS_IN_YEAR = new BigDecimal("12");
    // F1.8: §87A rebate threshold (New Regime FY 2024-25) and 4% health-and-education cess.
    private static final BigDecimal REBATE_87A_LIMIT = new BigDecimal("700000");
    private static final BigDecimal CESS_MULTIPLIER = new BigDecimal("1.04");
    // ─── TDS rate constants ─────────────────────────────────────────────────
    private static final BigDecimal RATE_5_PCT = new BigDecimal("0.05");
    private static final BigDecimal RATE_10_PCT = new BigDecimal("0.10");
    private static final BigDecimal RATE_15_PCT = new BigDecimal("0.15");
    private static final BigDecimal RATE_20_PCT = new BigDecimal("0.20");
    private static final BigDecimal RATE_30_PCT = new BigDecimal("0.30");
    // ─── Professional Tax state-specific constants ────────────────────────────
    private static final BigDecimal PT_KA_THRESHOLD = new BigDecimal("15000");
    private static final BigDecimal PT_KA_AMOUNT = new BigDecimal("200");
    private static final BigDecimal PT_TN_AMOUNT = new BigDecimal("208");
    // Maharashtra MH slabs (monthly salary → PT amount)
    private static final BigDecimal MH_SLAB_1 = new BigDecimal("7500");
    private static final BigDecimal MH_SLAB_2 = new BigDecimal("10000");
    private static final BigDecimal MH_PT_1 = new BigDecimal("175");
    private static final BigDecimal MH_PT_2 = new BigDecimal("200");
    private final LWFService lwfService;

    /**
     * F1.1: When true (default), employee PF is capped at the ₹15,000 wage ceiling
     * (statutory minimum under EPF Act). Set to false per-tenant if the employer/employee
     * agreement opts to contribute on actual basic (voluntary higher contribution).
     */
    @Value("${app.payroll.pf.apply-ceiling-employee:true}")
    private boolean pfApplyCeilingEmployee;

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

        // S11-M Wave-10 P0-1: tenant-local civil day (IST fallback) so payroll month resolves correctly.
        // TODO(S11-M): inject TenantTimeService and use tenantTimeService.today(tenantId).
        LocalDate now = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        return calculate(employeeId, basicSalary, grossSalary, state,
                now.getMonthValue(), now.getYear());
    }

    /**
     * Calculates all India statutory deductions including LWF for a specific payroll period.
     *
     * @param employeeId  UUID of the employee
     * @param basicSalary monthly basic salary in INR
     * @param grossSalary monthly gross salary in INR
     * @param state       Indian state code or name
     * @param month       payroll month (1-12)
     * @param year        payroll year
     * @return a fully populated {@link StatutoryDeductions} DTO
     */
    @Transactional(readOnly = true)
    public StatutoryDeductions calculate(
            UUID employeeId,
            BigDecimal basicSalary,
            BigDecimal grossSalary,
            String state,
            int month,
            int year) {

        log.debug("Calculating statutory deductions: employeeId={}, basic={}, gross={}, state={}, period={}/{}",
                employeeId, basicSalary, grossSalary, state, month, year);

        BigDecimal employeePf = calculateEmployeePf(basicSalary);
        BigDecimal employerPf = calculateEmployerPf(basicSalary);
        LocalDate payPeriodStart = LocalDate.of(year, month, 1);
        BigDecimal employeeEsi = calculateEmployeeEsi(grossSalary, payPeriodStart, employeeId);
        BigDecimal employerEsi = calculateEmployerEsi(grossSalary, payPeriodStart, employeeId);
        BigDecimal pt = calculateProfessionalTax(grossSalary, state, employeeId);
        BigDecimal tds = calculateMonthlyTds(grossSalary);

        // LWF — fixed amount based on state rules, only in applicable months
        BigDecimal employeeLwf = lwfService.calculateLWFForEmployee(
                employeeId, state, grossSalary, month, year);
        BigDecimal employerLwf = lwfService.getEmployerContribution(state, month, year);

        BigDecimal totalEmployee = employeePf
                .add(employeeEsi)
                .add(pt)
                .add(tds)
                .add(employeeLwf)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalEmployer = employerPf
                .add(employerEsi)
                .add(employerLwf)
                .setScale(2, RoundingMode.HALF_UP);

        return StatutoryDeductions.builder()
                .employeeId(employeeId)
                .employeePf(employeePf)
                .employerPf(employerPf)
                .employeeEsi(employeeEsi)
                .employerEsi(employerEsi)
                .professionalTax(pt)
                .tdsMonthly(tds)
                .employeeLwf(employeeLwf)
                .employerLwf(employerLwf)
                .totalEmployeeDeductions(totalEmployee)
                .totalEmployerContributions(totalEmployer)
                .build();
    }

    // ─── PF ──────────────────────────────────────────────────────────────────

    /**
     * Employee PF = 12% of basic salary.
     * <p>F1.1 fix: EPF Act §6 requires PF contribution on wages up to the statutory
     * ceiling (₹15,000). Previously uncapped, causing over-deduction for high earners
     * and exposing the employer to refund liability under PF Commissioner orders.
     * Per-tenant override via {@code app.payroll.pf.apply-ceiling-employee} (default true).
     */
    private BigDecimal calculateEmployeePf(BigDecimal basicSalary) {
        BigDecimal wage = pfApplyCeilingEmployee ? basicSalary.min(PF_WAGE_CEILING) : basicSalary;
        return wage.multiply(PF_RATE).setScale(2, RoundingMode.HALF_UP);
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
     * Employee ESI = 0.75% of gross salary.
     * <p>F1.2 fix — Reg.40 of ESI (Central) Rules, 1950: an employee whose wages exceed
     * the ₹21,000 ceiling mid-contribution-period continues to be an "employee" until the
     * end of that period. Contribution periods are April–September and October–March.
     * <p>If we don't know the gross at period start (no payslip history), we err on the
     * compliant side and treat as exempt — the same as the pre-fix behavior.
     */
    private BigDecimal calculateEmployeeEsi(BigDecimal grossSalary, LocalDate payPeriodStart, UUID employeeId) {
        if (grossSalary.compareTo(ESI_GROSS_CEILING) > 0) {
            LocalDate periodStart = periodStartFor(payPeriodStart);
            BigDecimal grossAtPeriodStart = lookupGrossAtPeriodStart(employeeId, periodStart);
            if (grossAtPeriodStart == null || grossAtPeriodStart.compareTo(ESI_GROSS_CEILING) > 0) {
                return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }
            // Crossed ceiling mid-period — keep contributing till period end.
        }
        return grossSalary.multiply(ESI_EMPLOYEE_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Backward-compatible overload — skips the Reg.40 mid-period check. Prefer the
     * employeeId-aware variant for production payroll runs.
     */
    @SuppressWarnings("unused")
    private BigDecimal calculateEmployeeEsi(BigDecimal grossSalary) {
        if (grossSalary.compareTo(ESI_GROSS_CEILING) > 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return grossSalary.multiply(ESI_EMPLOYEE_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Employer ESI = 3.25% of gross salary. Same Reg.40 mid-period semantics as
     * {@link #calculateEmployeeEsi(BigDecimal, LocalDate, UUID)}.
     */
    private BigDecimal calculateEmployerEsi(BigDecimal grossSalary, LocalDate payPeriodStart, UUID employeeId) {
        if (grossSalary.compareTo(ESI_GROSS_CEILING) > 0) {
            LocalDate periodStart = periodStartFor(payPeriodStart);
            BigDecimal grossAtPeriodStart = lookupGrossAtPeriodStart(employeeId, periodStart);
            if (grossAtPeriodStart == null || grossAtPeriodStart.compareTo(ESI_GROSS_CEILING) > 0) {
                return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }
        }
        return grossSalary.multiply(ESI_EMPLOYER_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Backward-compatible overload — skips the Reg.40 mid-period check.
     */
    @SuppressWarnings("unused")
    private BigDecimal calculateEmployerEsi(BigDecimal grossSalary) {
        if (grossSalary.compareTo(ESI_GROSS_CEILING) > 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return grossSalary.multiply(ESI_EMPLOYER_RATE).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Returns the start date of the ESI contribution period that contains {@code date}.
     * Period 1: 1-April to 30-September. Period 2: 1-October to 31-March (next year).
     */
    private LocalDate periodStartFor(LocalDate date) {
        int month = date.getMonthValue();
        if (month >= 4 && month <= 9) {
            return date.withMonth(4).withDayOfMonth(1);
        }
        if (month >= 10) {
            return date.withMonth(10).withDayOfMonth(1);
        }
        // Jan–Mar: period started 1-Oct of the previous calendar year.
        return date.minusYears(1).withMonth(10).withDayOfMonth(1);
    }

    /**
     * TODO(F1.2-wiring): Look up the employee's gross salary on/around the contribution
     * period start, e.g. via {@code PayslipRepository.findLatestBeforeOrEqual(employeeId,
     * periodStart)}. Returning {@code null} means "we don't know" → caller defaults to
     * exempt-above-ceiling (safe pre-fix behavior). Owned by S5 payroll-history sweep.
     */
    private BigDecimal lookupGrossAtPeriodStart(UUID employeeId, LocalDate periodStart) {
        return null;
    }

    // ─── Professional Tax ────────────────────────────────────────────────────

    /**
     * Returns monthly professional tax based on state-specific slabs.
     *
     * <ul>
     *   <li><b>Karnataka</b>: ₹200/month if gross ≥ ₹15,000, else ₹0 (F1.7 fix: was {@code &gt;})</li>
     *   <li><b>Maharashtra</b>: gender-aware slabs — F1.13 (women exempt up to ₹25,000)</li>
     *   <li><b>Tamil Nadu</b>: ₹208/month (flat, for all earning employees)</li>
     *   <li><b>Others</b>: ₹0 (configurable in future)</li>
     * </ul>
     */
    private BigDecimal calculateProfessionalTax(BigDecimal grossSalary, String state, UUID employeeId) {
        if (state == null || state.isBlank()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return switch (state.trim().toUpperCase()) {
            // F1.7: Karnataka PT statute KTPT Act schedule: salary ≥ ₹15,000 → ₹200.
            case "KARNATAKA", "KA" -> grossSalary.compareTo(PT_KA_THRESHOLD) >= 0
                    ? PT_KA_AMOUNT.setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            // F1.13: Maharashtra PT requires gender for the women's exemption slab.
            case "MAHARASHTRA", "MH" -> calculateMaharashtraPt(grossSalary, lookupGender(employeeId));

            case "TAMIL NADU", "TN" -> PT_TN_AMOUNT.setScale(2, RoundingMode.HALF_UP);

            default -> BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        };
    }

    /**
     * Backward-compatible overload — falls back to non-FEMALE Maharashtra slab.
     */
    @SuppressWarnings("unused")
    private BigDecimal calculateProfessionalTax(BigDecimal grossSalary, String state) {
        return calculateProfessionalTax(grossSalary, state, null);
    }

    /**
     * Maharashtra professional tax slabs (monthly gross) — gender-aware per
     * Maharashtra State Tax on Professions Act §27A and notifications:
     * <pre>
     *   FEMALE:
     *     ≤ ₹25,000 → ₹0   (exemption)
     *     &gt; ₹25,000 → ₹200
     *   Others (MALE / OTHER / unknown):
     *     ≤ ₹7,500   → ₹0
     *     ₹7,501–₹10,000 → ₹175
     *     &gt; ₹10,000  → ₹200
     * </pre>
     */
    private BigDecimal calculateMaharashtraPt(BigDecimal grossSalary, Employee.Gender gender) {
        if (gender == Employee.Gender.FEMALE) {
            if (grossSalary.compareTo(new BigDecimal("25000")) > 0) {
                return MH_PT_2.setScale(2, RoundingMode.HALF_UP);
            }
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (grossSalary.compareTo(MH_SLAB_2) > 0) {
            return MH_PT_2.setScale(2, RoundingMode.HALF_UP);
        }
        if (grossSalary.compareTo(MH_SLAB_1) > 0) {
            return MH_PT_1.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * TODO(F1.13-wiring): Look up {@link Employee#getGender()} via EmployeeRepository.
     * Returning {@code null} means "unknown" → caller defaults to the non-FEMALE slab
     * (pre-fix behavior). Owned by S5 payroll-history sweep — needs EmployeeRepository
     * injection without creating a payroll→employee circular dep.
     */
    private Employee.Gender lookupGender(UUID employeeId) {
        return null;
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
     * <p>F1.8 fix: §87A rebate (taxable income ≤ ₹7L → tax = 0) and 4% health-and-
     * education cess are now applied. TODO(F1.8-surcharge): surcharge bands
     * (10% for 50L–1Cr, 15% for 1–2Cr, 25% for 2–5Cr, 37% for &gt;5Cr) — out of
     * scope for this hotfix as they require marginal-relief logic per §2(3) of
     * the Finance Act.
     */
    private BigDecimal calculateMonthlyTds(BigDecimal grossSalary) {
        BigDecimal annualIncome = grossSalary.multiply(MONTHS_IN_YEAR);
        BigDecimal annualTax = computeNewRegimeTax(annualIncome);
        return annualTax.divide(MONTHS_IN_YEAR, 2, RoundingMode.HALF_UP);
    }

    /**
     * Computes annual income tax under the New Regime for FY 2024-25, including
     * §87A rebate and 4% health-and-education cess (F1.8).
     */
    private BigDecimal computeNewRegimeTax(BigDecimal annualIncome) {
        if (annualIncome.compareTo(SLAB_3L) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal tax = BigDecimal.ZERO;

        // 5% on ₹3L–₹6L band
        if (annualIncome.compareTo(SLAB_3L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_6L).subtract(SLAB_3L);
            tax = tax.add(taxable.multiply(RATE_5_PCT));
        }

        // 10% on ₹6L–₹9L band
        if (annualIncome.compareTo(SLAB_6L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_9L).subtract(SLAB_6L);
            tax = tax.add(taxable.multiply(RATE_10_PCT));
        }

        // 15% on ₹9L–₹12L band
        if (annualIncome.compareTo(SLAB_9L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_12L).subtract(SLAB_9L);
            tax = tax.add(taxable.multiply(RATE_15_PCT));
        }

        // 20% on ₹12L–₹15L band
        if (annualIncome.compareTo(SLAB_12L) > 0) {
            BigDecimal taxable = annualIncome.min(SLAB_15L).subtract(SLAB_12L);
            tax = tax.add(taxable.multiply(RATE_20_PCT));
        }

        // 30% above ₹15L
        if (annualIncome.compareTo(SLAB_15L) > 0) {
            BigDecimal taxable = annualIncome.subtract(SLAB_15L);
            tax = tax.add(taxable.multiply(RATE_30_PCT));
        }

        // F1.8: §87A rebate — full waiver for taxable income up to ₹7L under New Regime.
        if (annualIncome.compareTo(REBATE_87A_LIMIT) <= 0) {
            tax = BigDecimal.ZERO;
        }

        // F1.8: 4% health-and-education cess on the tax payable (post-rebate).
        tax = tax.multiply(CESS_MULTIPLIER);

        return tax.setScale(2, RoundingMode.HALF_UP);
    }
}
