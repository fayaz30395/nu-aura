package com.hrms.application.payroll.strategy;

import com.hrms.application.payroll.strategy.StatutoryCalculator.StatutoryCalculationInput;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * United Kingdom statutory calculator strategy — skeleton placeholder.
 *
 * <p>Per the wave-3 i18n audit (recommendation #14), this class exists to reserve
 * the strategy seam so future UK payroll work (PAYE income tax using HMRC tax-code
 * tables; Class 1 Primary and Secondary National Insurance Contributions;
 * student loan plans; pension auto-enrolment under the Pensions Act 2008) can be
 * added without modifying consumer code or the {@link StatutoryCalculator} contract.
 *
 * <p>Calling {@link #calculate(StatutoryCalculationInput)} today raises
 * {@link UnsupportedOperationException}. Activated only when explicitly opted in
 * via {@code app.statutory.country=UK} so it never displaces the India default in
 * production.
 *
 * <p>TODO(i18n-#14-UK): implement PAYE, NIC (Class 1 Primary/Secondary), student
 * loan deductions, postgraduate loan, auto-enrolment pension contributions.
 * Owner: payroll squad, wave-4.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.statutory.country", havingValue = "UK")
public class UkStatutoryCalculator implements StatutoryCalculator {

    /**
     * ISO 3166-1 alpha-2 code for the United Kingdom.
     *
     * <p>Note: the formally-assigned ISO code for the UK is {@code GB}; we use
     * {@code UK} here to match the wave-3 i18n spec, which standardises on the
     * common-usage code. Callers must use {@code "UK"} when routing.
     */
    private static final String COUNTRY_CODE = "UK";

    @Override
    public String countryCode() {
        return COUNTRY_CODE;
    }

    @Override
    public StatutoryResult calculate(StatutoryCalculationInput input) {
        log.warn("UK statutory calculation requested but engine is not yet implemented: employeeId={}",
                input == null ? null : input.employeeId());
        throw new UnsupportedOperationException(
                "UK statutory engine not yet implemented (i18n audit #14 — pending PAYE/NIC/auto-enrolment).");
    }
}
