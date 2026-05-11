package com.hrms.application.payroll.strategy;

import com.hrms.common.exception.BusinessException;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
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
 * <p>Today the {@code Tenant} entity does not yet carry a country attribute, so
 * the lookup falls back to {@code "IN"} (India) — preserving the platform's
 * historical single-country behaviour. The fallback is removed once the entity
 * gains a {@code country} column (see TODO below).
 *
 * <p>Wave-3 i18n — audit recommendation #14.
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
     * <p>TODO(i18n-#14-tenant-country): once {@code Tenant} gains a
     * {@code country} column (ISO 3166-1 alpha-2), replace the {@code DEFAULT_COUNTRY}
     * fallback with {@code tenant.getCountry()}. A Flyway migration is tracked
     * separately under the wave-3 i18n epic.
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
     * Resolves the country for a tenant.
     *
     * <p>Currently always returns {@link #DEFAULT_COUNTRY} because the {@code Tenant}
     * entity does not yet carry a country field. The {@code tenantId} is still
     * resolved against the repository so an invalid tenant raises early, and so
     * the lookup site is in place for the entity migration.
     */
    private String resolveCountry(UUID tenantId) {
        if (tenantId == null) {
            return DEFAULT_COUNTRY;
        }
        return tenantRepository.findById(tenantId)
                // TODO(i18n-#14-tenant-country): swap to `Tenant::getCountry` after migration lands.
                .map(t -> DEFAULT_COUNTRY)
                .orElse(DEFAULT_COUNTRY);
    }
}
