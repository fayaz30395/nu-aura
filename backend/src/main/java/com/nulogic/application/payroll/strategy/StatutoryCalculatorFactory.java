package com.nulogic.application.payroll.strategy;

import com.nulogic.common.exception.BusinessException;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Selects the {@link StatutoryCalculator} implementation appropriate for a given
 * tenant based on its country of operation.
 *
 * <p>Spring autowires every {@link StatutoryCalculator} bean active in the current
 * profile (gated by {@code @ConditionalOnProperty(app.statutory.country=...)}).
 * The factory then resolves the tenant's country and returns the calculator whose
 * {@link StatutoryCalculator#countryCode()} matches.
 *
 * <p>V155 added {@code tenants.country} (ISO 3166-1 alpha-2, NOT NULL DEFAULT 'IN'),
 * so resolution is now {@code Tenant::getCountry} with a {@link #DEFAULT_COUNTRY}
 * fallback only when the tenantId is null (system callers) or the row is unknown.
 *
 * <p>Wave-3 i18n — audit recommendation #14 (closed S9-C/S9-D).
 */
@Slf4j
@Component
public class StatutoryCalculatorFactory {

    /**
     * Default country when a tenant has no country attribute yet. Matches the
     * platform's historical India-only behaviour.
     */
    private static final String DEFAULT_COUNTRY = "IN";

    private final List<StatutoryCalculator> calculators;
    private final TenantRepository tenantRepository;

    public StatutoryCalculatorFactory(
            List<StatutoryCalculator> calculators,
            TenantRepository tenantRepository) {
        this.calculators = calculators;
        this.tenantRepository = tenantRepository;
        log.info("StatutoryCalculatorFactory initialised with {} calculator(s): {}",
                calculators.size(),
                calculators.stream().map(StatutoryCalculator::countryCode).toList());
    }

    /**
     * Returns the {@link StatutoryCalculator} bound to the given tenant's country.
     *
     * @param tenantId the tenant the payroll run belongs to
     * @return a matching calculator
     * @throws BusinessException if no active calculator handles the resolved country
     */
    public StatutoryCalculator forTenant(UUID tenantId) {
        String countryCode = resolveCountry(tenantId);
        return forCountry(countryCode);
    }

    /**
     * Returns the calculator for an explicit country code. Useful for tests and
     * for callers that already know the jurisdiction (for example a system-level
     * job that loops over tenants).
     *
     * @param countryCode ISO 3166-1 alpha-2 code (case-insensitive)
     * @return a matching calculator
     * @throws BusinessException if no active calculator handles the country
     */
    public StatutoryCalculator forCountry(String countryCode) {
        String normalised = countryCode == null ? DEFAULT_COUNTRY : countryCode.trim().toUpperCase();
        return calculators.stream()
                .filter(c -> normalised.equals(c.countryCode()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "No statutory calculator for country: " + normalised));
    }

    /**
     * PROD-4: validates up-front that payroll can actually run for the tenant's
     * country. Throws a clear, actionable error when the country either has no
     * registered calculator or only a skeleton placeholder (US/UK 501 stubs),
     * instead of letting a payroll run fail mid-processing with HTTP 501.
     *
     * <p>Launch scope is IN-only; the stubs are intentionally kept (do not delete)
     * so the strategy seam stays reserved for wave-4 implementations.
     *
     * @param tenantId the tenant a payroll run is being created for
     * @throws BusinessException when no production-ready calculator exists
     */
    public void assertPayrollSupported(UUID tenantId) {
        String countryCode = resolveCountry(tenantId);
        StatutoryCalculator calculator = calculators.stream()
                .filter(c -> countryCode.equals(c.countryCode()))
                .findFirst()
                .orElse(null);
        if (calculator == null || !calculator.isImplemented()) {
            throw new BusinessException(
                    "Payroll runs are currently supported for India (IN) tenants only. "
                            + "Tenant country '" + countryCode + "' has no production-ready statutory "
                            + "engine yet — update the tenant country or contact support before "
                            + "creating payroll runs.");
        }
    }

    /**
     * Resolves the country for a tenant. Reads {@link Tenant#getCountry()} which is
     * NOT NULL after V155. Falls back to {@link #DEFAULT_COUNTRY} when the tenantId
     * is null (system callers) or the row is missing; logs WARN on the missing-row
     * path since the constraint should make it impossible in production.
     */
    private String resolveCountry(UUID tenantId) {
        if (tenantId == null) {
            return DEFAULT_COUNTRY;
        }
        return tenantRepository.findById(tenantId)
                .map(Tenant::getCountry)
                .map(c -> c == null || c.isBlank() ? DEFAULT_COUNTRY : c.trim().toUpperCase())
                .orElseGet(() -> {
                    log.warn("Tenant {} not found in country lookup — falling back to {}",
                            tenantId, DEFAULT_COUNTRY);
                    return DEFAULT_COUNTRY;
                });
    }
}
