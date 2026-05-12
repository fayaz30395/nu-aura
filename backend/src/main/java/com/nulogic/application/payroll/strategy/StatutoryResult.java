package com.nulogic.application.payroll.strategy;

import com.nulogic.application.payroll.dto.StatutoryDeductions;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Country-agnostic result of a statutory calculation.
 *
 * <p>Different jurisdictions expose different deduction lines (India: PF/ESI/PT/TDS/LWF,
 * US: FICA/Medicare/Federal/State, UK: PAYE/NI, …), so deductions and contributions are
 * carried as named maps keyed by short component codes (for example {@code "PF_EMPLOYEE"},
 * {@code "FICA_SS"}, {@code "PAYE"}).
 *
 * <p>Component keys are stable per-country and form the contract with downstream payslip
 * rendering. See each {@link StatutoryCalculator} implementation's Javadoc for its key set.
 *
 * <p>The legacy India-only DTO {@link StatutoryDeductions} can be obtained via
 * {@link #legacyIndiaView()} during the migration window in which both shapes coexist.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatutoryResult {

    /**
     * The employee this result is for (informational, not persisted here).
     */
    private UUID employeeId;

    /**
     * ISO 3166-1 alpha-2 country code that produced this result, copied from the
     * originating {@link StatutoryCalculator#countryCode()}. Useful for audit logs.
     */
    private String countryCode;

    /**
     * ISO 4217 currency code of all monetary values in this result
     * (for example {@code "INR"}, {@code "USD"}, {@code "GBP"}).
     */
    private String currencyCode;

    /**
     * Employee-borne deduction lines keyed by component code (for example
     * {@code "PF_EMPLOYEE"}, {@code "ESI_EMPLOYEE"}, {@code "PT"}, {@code "TDS"},
     * {@code "LWF_EMPLOYEE"}). Insertion order preserved when built via
     * {@link java.util.LinkedHashMap}.
     */
    @Builder.Default
    private Map<String, BigDecimal> deductions = new LinkedHashMap<>();

    /**
     * Employer-borne contribution lines keyed by component code (for example
     * {@code "PF_EMPLOYER"}, {@code "ESI_EMPLOYER"}, {@code "LWF_EMPLOYER"}).
     */
    @Builder.Default
    private Map<String, BigDecimal> contributions = new LinkedHashMap<>();

    /**
     * Sum of all employee deductions. Set explicitly by the calculator using
     * the same {@link RoundingMode#HALF_UP} convention as the inputs.
     */
    private BigDecimal totalEmployeeDeductions;

    /**
     * Sum of all employer contributions. Set explicitly by the calculator.
     */
    private BigDecimal totalEmployerContributions;

    /**
     * Returns the named deduction or {@link BigDecimal#ZERO} if absent.
     * Convenience for callers that don't need to distinguish "zero" from "missing".
     *
     * @param key the component code
     * @return the deduction amount, never {@code null}
     */
    public BigDecimal deduction(String key) {
        Map<String, BigDecimal> map = deductions == null ? Collections.emptyMap() : deductions;
        BigDecimal v = map.get(key);
        return v == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : v;
    }

    /**
     * Returns the named contribution or {@link BigDecimal#ZERO} if absent.
     *
     * @param key the component code
     * @return the contribution amount, never {@code null}
     */
    public BigDecimal contribution(String key) {
        Map<String, BigDecimal> map = contributions == null ? Collections.emptyMap() : contributions;
        BigDecimal v = map.get(key);
        return v == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : v;
    }

    /**
     * Returns a legacy India-shaped view of this result for backward compatibility
     * with code still consuming the {@link StatutoryDeductions} DTO. Component keys
     * follow the {@code IndianStatutoryCalculator} convention.
     *
     * <p>Non-India results will still produce a {@code StatutoryDeductions} populated
     * from any matching keys; absent keys default to zero.
     *
     * @return a {@link StatutoryDeductions} populated from this result's maps
     */
    public StatutoryDeductions legacyIndiaView() {
        return StatutoryDeductions.builder()
                .employeeId(employeeId)
                .employeePf(deduction("PF_EMPLOYEE"))
                .employerPf(contribution("PF_EMPLOYER"))
                .employeeEsi(deduction("ESI_EMPLOYEE"))
                .employerEsi(contribution("ESI_EMPLOYER"))
                .professionalTax(deduction("PT"))
                .tdsMonthly(deduction("TDS"))
                .employeeLwf(deduction("LWF_EMPLOYEE"))
                .employerLwf(contribution("LWF_EMPLOYER"))
                .totalEmployeeDeductions(totalEmployeeDeductions)
                .totalEmployerContributions(totalEmployerContributions)
                .build();
    }
}
