package com.nulogic.application.payroll.strategy;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * United States statutory calculator strategy — skeleton placeholder.
 *
 * <p>Per the wave-3 i18n audit (recommendation #14), this class exists to reserve
 * the strategy seam so future US payroll work (FICA Social Security 6.2% capped at
 * the SSA wage base; Medicare 1.45% plus 0.9% additional above thresholds; FUTA
 * employer 6.0% on the first $7,000; federal income tax withholding via IRS
 * Publication 15-T; state and local withholding) can be added without modifying
 * consumer code or the {@link StatutoryCalculator} contract.
 *
 * <p>Calling {@link #calculate(StatutoryCalculationInput)} today raises
 * {@link UnsupportedOperationException}. Activated only when explicitly opted in
 * via {@code app.statutory.country=US} so it never displaces the India default in
 * production.
 *
 * <p>TODO(i18n-#14-US): implement FICA, federal withholding (Pub 15-T),
 * state withholding, FUTA/SUTA. Owner: payroll squad, wave-4.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.statutory.country", havingValue = "US")
public class UsStatutoryCalculator implements StatutoryCalculator {

    /**
     * ISO 3166-1 alpha-2 code for the United States.
     */
    private static final String COUNTRY_CODE = "US";

    @Override
    public String countryCode() {
        return COUNTRY_CODE;
    }

    /**
     * Skeleton only — payroll-run creation for US tenants is blocked (PROD-4).
     */
    @Override
    public boolean isImplemented() {
        return false;
    }

    @Override
    public StatutoryResult calculate(StatutoryCalculationInput input) {
        log.warn("US statutory calculation requested but engine is not yet implemented: employeeId={}",
                input == null ? null : input.employeeId());
        throw new UnsupportedOperationException(
                "US statutory engine not yet implemented (i18n audit #14 — pending FICA/federal/state withholding).");
    }
}
