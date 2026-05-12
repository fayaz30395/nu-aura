package com.hrms.application.payroll.strategy;

import com.hrms.domain.employee.Employee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Strategy interface for country-specific statutory deduction calculators.
 *
 * <p>This seam decouples payroll consumers from the India-specific
 * {@link com.hrms.application.payroll.service.StatutoryDeductionService} so that
 * additional country engines (US FICA / Federal Withholding, UK PAYE / NI, EU
 * jurisdictions, etc.) can be plugged in without modifying calling code.
 *
 * <p>Implementations are Spring beans selected by country code via
 * {@link StatutoryCalculatorFactory}.
 *
 * <p>Wave-3 i18n — audit recommendation #14.
 *
 * @see com.hrms.application.payroll.service.StatutoryDeductionService
 * @see StatutoryCalculatorFactory
 */
public interface StatutoryCalculator {

    /**
     * Returns the ISO 3166-1 alpha-2 country code this calculator supports
     * (for example {@code "IN"}, {@code "US"}, {@code "UK"}).
     *
     * <p>Used by {@link StatutoryCalculatorFactory} to route a tenant's payroll
     * computation to the correct implementation.
     *
     * @return the supported ISO 3166-1 alpha-2 country code
     */
    String countryCode();

    /**
     * Calculates statutory deductions and employer contributions for the given
     * payroll inputs under the calculator's country rules.
     *
     * @param input the per-employee inputs (gross/basic, gender, state, period)
     * @return a {@link StatutoryResult} with country-specific deductions and
     * contributions; never {@code null}
     * @throws UnsupportedOperationException if a country implementation has not
     *                                       yet been wired (skeleton-only)
     */
    StatutoryResult calculate(StatutoryCalculationInput input);

    /**
     * Per-employee inputs for a single payroll period.
     *
     * <p>Carries the union of fields used by all current and planned country
     * calculators. Country-specific fields ({@code state} for India professional
     * tax, {@code gender} for Maharashtra PT) are nullable so jurisdictions that
     * don't need them can ignore them. New countries that require additional
     * inputs (for example a UK tax code) extend this record with nullable fields
     * rather than introducing per-country input types.
     *
     * @param employeeId   the employee being calculated for (required)
     * @param grossSalary  monthly gross salary in the tenant's local currency
     *                     (required)
     * @param basicSalary  monthly basic salary in the tenant's local currency
     *                     (required for India PF; may be {@code null} elsewhere)
     * @param gender       employee gender for gender-aware slabs (Maharashtra
     *                     PT); {@code null} → fallback slab
     * @param state        sub-national jurisdiction (Indian state, US state, UK
     *                     country); free-form string keyed by country rules
     * @param month        payroll month (1–12); defaults to current month when
     *                     {@code null} via the legacy delegate overloads
     * @param year         payroll year; defaults to current year when
     *                     {@code null}
     * @param payPeriodEnd optional period-end date for jurisdictions that need
     *                     a date object instead of (month, year)
     */
    record StatutoryCalculationInput(
            UUID employeeId,
            BigDecimal grossSalary,
            BigDecimal basicSalary,
            Employee.Gender gender,
            String state,
            int month,
            int year,
            LocalDate payPeriodEnd
    ) {
        /**
         * Convenience constructor that defaults {@code payPeriodEnd} to {@code null}.
         */
        public StatutoryCalculationInput(
                UUID employeeId,
                BigDecimal grossSalary,
                BigDecimal basicSalary,
                Employee.Gender gender,
                String state,
                int month,
                int year) {
            this(employeeId, grossSalary, basicSalary, gender, state, month, year, null);
        }
    }
}
