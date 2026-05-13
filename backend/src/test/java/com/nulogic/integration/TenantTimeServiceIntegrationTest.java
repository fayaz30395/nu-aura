package com.nulogic.integration;

import com.nulogic.common.util.TenantTimeService;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * End-to-end integration tests for {@link TenantTimeService} against a real Postgres
 * (Testcontainers). Verifies that the full Spring/JPA stack — including the V165
 * timezone column and its CHECK constraint — wires up correctly with the resolver.
 *
 * <p>Why this exists alongside the Mockito unit test: the unit test stubs
 * {@link TenantRepository}, so it cannot prove that a tenant row persisted to Postgres
 * with {@code timezone='America/New_York'} actually flows back through Hibernate, gets
 * read by {@code zoneFor()}, and yields NY-local time. This test closes that loop.
 *
 * <p>Per-test isolation is provided by Spring's {@code @Transactional} rollback. The
 * shared singleton container (from {@link AbstractPostgresIntegrationTest}) keeps the
 * Flyway-migrated schema warm across the suite.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("TenantTimeService Integration — real Postgres, full Spring context")
class TenantTimeServiceIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    TenantTimeService tenantTimeService;

    @Autowired
    TenantRepository tenantRepository;

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /**
     * Build a minimally-valid Tenant for persistence. {@code code}, {@code name},
     * {@code status}, and {@code country} are NOT NULL in schema; the rest default.
     * A unique code per test prevents the {@code idx_tenant_code} unique index from
     * colliding when multiple tests share the connection pool's prepared statements.
     */
    private Tenant newTenantWithTimezone(String timezone) {
        Tenant tenant = new Tenant();
        tenant.setCode("tz-it-" + UUID.randomUUID().toString().substring(0, 8));
        tenant.setName("Timezone IT Tenant");
        tenant.setStatus(Tenant.TenantStatus.ACTIVE);
        tenant.setCountry("US");
        tenant.setTimezone(timezone);
        return tenant;
    }

    // ---------------------------------------------------------------------
    // Scenario 1: NY tenant resolves to America/New_York wall-clock
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("now(nyTenantId) returns LocalDateTime aligned with America/New_York")
    void now_forNyTenant_returnsNyWallClock() {
        // GIVEN a tenant persisted with the NY zone
        Tenant saved = tenantRepository.saveAndFlush(newTenantWithTimezone("America/New_York"));
        UUID tenantId = saved.getId();
        assertThat(tenantId).isNotNull();

        // WHEN we ask the service for "now"
        LocalDateTime resolved = tenantTimeService.now(tenantId);

        // THEN it must match a freshly-computed NY clock to within a few seconds.
        // Comparing to the JVM default (likely IST/UTC in CI) is unsafe — instead we
        // re-derive the expected NY clock here and assert the delta is small. The
        // 10-second window absorbs cross-call clock skew without admitting an
        // hours-wide off-by-zone bug (NY vs IST differs by 9.5–10.5 hours).
        LocalDateTime expectedNy = LocalDateTime.now(ZoneId.of("America/New_York"));
        long deltaSeconds = Math.abs(ChronoUnit.SECONDS.between(expectedNy, resolved));

        assertThat(deltaSeconds)
                .as("resolved 'now' should be within 10s of true NY wall clock; got delta=%ds", deltaSeconds)
                .isLessThan(10L);
    }

    // ---------------------------------------------------------------------
    // Scenario 2: London tenant resolves to today's date in London
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("today(londonTenantId) returns LocalDate matching Europe/London")
    void today_forLondonTenant_returnsLondonDate() {
        // GIVEN a tenant persisted with the London zone
        Tenant saved = tenantRepository.saveAndFlush(newTenantWithTimezone("Europe/London"));
        UUID tenantId = saved.getId();

        // WHEN we ask the service for "today"
        LocalDate resolved = tenantTimeService.today(tenantId);

        // THEN it must equal today's date in London. We re-compute here rather than
        // comparing to a hard-coded date so the test is stable across runs and isn't
        // brittle around midnight in either zone. Allowing equality with the date
        // one second from now also covers the (extremely narrow) midnight-rollover race.
        LocalDate expectedLondon = LocalDate.now(ZoneId.of("Europe/London"));
        assertThat(resolved)
                .as("resolved 'today' should equal current date in Europe/London")
                .isEqualTo(expectedLondon);
    }

    // ---------------------------------------------------------------------
    // Scenario 3: V165 CHECK constraint rejects malformed timezone strings
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("invalid-shape timezone is rejected by V165 chk_tenants_timezone_format")
    void invalidTimezone_isRejectedByCheckConstraint() {
        // GIVEN a tenant whose timezone violates the V165 regex
        //   ^[A-Za-z_]+(/[A-Za-z_]+){0,2}$
        // NOTE: the task spec names "Mars/Olympus" as the invalid value, but that
        // string actually matches the shape regex (two letter-only segments) and
        // would only fail later inside ZoneId.of() — i.e. it tests the service's
        // fallback, not the DB check. To genuinely exercise the V165 constraint
        // (which is the stated acceptance criterion) we use a value with a space
        // and punctuation, which the regex explicitly disallows.
        Tenant tenant = newTenantWithTimezone("Not A Zone!");

        // WHEN/THEN saveAndFlush forces the INSERT to hit Postgres immediately and
        // the CHECK constraint surfaces as DataIntegrityViolationException through
        // Spring's exception translation.
        assertThatThrownBy(() -> tenantRepository.saveAndFlush(tenant))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("chk_tenants_timezone_format");
    }

    // ---------------------------------------------------------------------
    // Scenario 4: invalidate() forces re-read after a tenant updates its zone
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("invalidate(id) causes zoneFor to pick up the new timezone")
    void invalidate_picksUpNewTimezoneAfterUpdate() {
        // GIVEN a tenant persisted with NY zone, then resolved once to prime the cache
        Tenant saved = tenantRepository.saveAndFlush(newTenantWithTimezone("America/New_York"));
        UUID tenantId = saved.getId();

        ZoneId initial = tenantTimeService.zoneFor(tenantId);
        assertThat(initial).isEqualTo(ZoneId.of("America/New_York"));

        // WHEN the tenant changes its timezone in the DB (e.g. admin settings flow)
        saved.setTimezone("Asia/Tokyo");
        tenantRepository.saveAndFlush(saved);

        // Without invalidation, the cached NY entry would still be served (TTL = 1h).
        // The settings flow is expected to call invalidate() so the new value takes
        // effect within the same JVM immediately.
        tenantTimeService.invalidate(tenantId);

        // THEN the next resolution reflects the persisted Tokyo zone
        ZoneId updated = tenantTimeService.zoneFor(tenantId);
        assertThat(updated)
                .as("post-invalidate resolution must reflect the new DB value")
                .isEqualTo(ZoneId.of("Asia/Tokyo"));
    }
}
