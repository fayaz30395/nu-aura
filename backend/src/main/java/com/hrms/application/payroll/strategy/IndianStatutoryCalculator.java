package com.hrms.application.payroll.strategy;

import com.hrms.application.payroll.dto.StatutoryDeductions;
import com.hrms.application.payroll.service.StatutoryDeductionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * India statutory calculator strategy.
 *
 * <p>Thin adapter over the existing {@link StatutoryDeductionService}; this class
 * does not duplicate or reinterpret any India tax logic. All PF / ESI / PT / TDS / LWF
 * arithmetic continues to live in {@code StatutoryDeductionService} (recently hardened
 * by ticket S4-B) and we only translate inputs/outputs to the country-agnostic shape.
 *
 * <p>Activated by default ({@code matchIfMissing = true}) so existing single-country
 * tenants keep working without configuration changes. Set
 * {@code app.statutory.country=US} (or similar) in a future multi-country deployment
 * to disable this bean and activate a different jurisdiction's calculator.
 *
 * <p>Component-code contract (deduction/contribution map keys):
 * <ul>
 *   <li>{@code PF_EMPLOYEE} — Provident Fund, employee 12% share</li>
 *   <li>{@code PF_EMPLOYER} — Provident Fund, employer 12% share (₹1,800 cap)</li>
 *   <li>{@code ESI_EMPLOYEE} — Employee State Insurance, employee 0.75%</li>
 *   <li>{@code ESI_EMPLOYER} — Employee State Insurance, employer 3.25%</li>
 *   <li>{@code PT} — Professional Tax (state-wise)</li>
 *   <li>{@code TDS} — Tax Deducted at Source, monthly</li>
 *   <li>{@code LWF_EMPLOYEE} — Labour Welfare Fund, employee share</li>
 *   <li>{@code LWF_EMPLOYER} — Labour Welfare Fund, employer share</li>
 * </ul>
 *
 * <p>Wave-3 i18n — audit recommendation #14.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.statutory.country", havingValue = "IN", matchIfMissing = true)
public class IndianStatutoryCalculator implements StatutoryCalculator {

    /**
     * ISO 3166-1 alpha-2 code for India.
     */
    private static final String COUNTRY_CODE = "IN";

    /**
     * ISO 4217 code for Indian Rupee.
     */
    private static final String CURRENCY_CODE = "INR";

    private final StatutoryDeductionService delegate;

    @Override
    public String countryCode() {
        return COUNTRY_CODE;
    }

    @Override
    public StatutoryResult calculate(StatutoryCalculationInput input) {
        if (input == null) {
            throw new IllegalArgumentException("StatutoryCalculationInput is required");
        }

        log.debug("Delegating India statutory calculation: employeeId={}, period={}/{}, state={}",
                input.employeeId(), input.month(), input.year(), input.state());

        StatutoryDeductions legacy = delegate.calculate(
                input.employeeId(),
                input.basicSalary(),
                input.grossSalary(),
                input.state(),
                input.month(),
                input.year());

        Map<String, BigDecimal> deductions = new LinkedHashMap<>();
        deductions.put("PF_EMPLOYEE", legacy.getEmployeePf());
        deductions.put("ESI_EMPLOYEE", legacy.getEmployeeEsi());
        deductions.put("PT", legacy.getProfessionalTax());
        deductions.put("TDS", legacy.getTdsMonthly());
        deductions.put("LWF_EMPLOYEE", legacy.getEmployeeLwf());

        Map<String, BigDecimal> contributions = new LinkedHashMap<>();
        contributions.put("PF_EMPLOYER", legacy.getEmployerPf());
        contributions.put("ESI_EMPLOYER", legacy.getEmployerEsi());
        contributions.put("LWF_EMPLOYER", legacy.getEmployerLwf());

        return StatutoryResult.builder()
                .employeeId(legacy.getEmployeeId())
                .countryCode(COUNTRY_CODE)
                .currencyCode(CURRENCY_CODE)
                .deductions(deductions)
                .contributions(contributions)
                .totalEmployeeDeductions(legacy.getTotalEmployeeDeductions())
                .totalEmployerContributions(legacy.getTotalEmployerContributions())
                .build();
    }
}
