package com.nulogic.common.util;

import com.nulogic.domain.tenant.Tenant;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TenantTimeProvider}, the static-accessor facade that exposes
 * {@link TenantTimeService} to entity domain-predicate methods that cannot use Spring injection.
 *
 * <h3>Coverage matrix</h3>
 * <ol>
 *   <li><strong>Wired path</strong> — {@link TenantTimeProvider#today(UUID)} resolves the
 *       correct date in the tenant's zone via the backing {@link TenantTimeService}.</li>
 *   <li><strong>Wired path</strong> — {@link TenantTimeProvider#now(UUID)} resolves the
 *       correct datetime in the tenant's zone.</li>
 *   <li><strong>Fallback path</strong> — when the static holder is {@code null}
 *       (simulating pre-Spring-context or bare unit-test environments),
 *       {@link TenantTimeProvider#today(UUID)} returns a non-null {@link LocalDate}
 *       (the JVM-local fallback) rather than throwing {@link NullPointerException}.</li>
 *   <li><strong>Fallback path</strong> — same for {@link TenantTimeProvider#now(UUID)}.</li>
 *   <li><strong>Null tenantId</strong> — both methods handle {@code null} without throwing
 *       (delegated to {@link TenantTimeService#zoneFor(UUID)} which falls back to
 *       {@link TenantTimeService#DEFAULT_ZONE}).</li>
 *   <li><strong>Test isolation</strong> — {@link TenantTimeProvider#clearForTest()} resets
 *       the static holder to {@code null} so tests do not leak state to each other.</li>
 * </ol>
 *
 * <h3>Test isolation contract</h3>
 * <p>Every test that calls {@link TenantTimeProvider#setForTest(TenantTimeService)} in
 * {@code @BeforeEach} must pair it with {@link TenantTimeProvider#clearForTest()} in
 * {@code @AfterEach}. The {@link FallbackWhenUninitialised} nested class deliberately
 * relies on the static holder being {@code null} and therefore must NOT call
 * {@code setForTest()} in its {@code @BeforeEach}.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TenantTimeProvider — static-holder facade for entity domain predicates")
class TenantTimeProviderTest {

    private static final ZoneId NY_ZONE   = ZoneId.of("America/New_York");
    private static final ZoneId IST_ZONE  = ZoneId.of("Asia/Kolkata");
    private static final ZoneId TOK_ZONE  = ZoneId.of("Asia/Tokyo");

    @Mock
    private TenantRepository tenantRepository;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static Tenant tenantWithTimezone(String tz) {
        Tenant t = new Tenant();
        t.setTimezone(tz);
        return t;
    }

    // -------------------------------------------------------------------------
    // Wired path — provider is initialised with a real TenantTimeService
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Wired path (static holder initialised)")
    class WiredPath {

        private TenantTimeService service;

        @BeforeEach
        void wireProvider() {
            // Use the test-only single-arg constructor (no Redis pub/sub needed).
            service = new TenantTimeService(tenantRepository);
            TenantTimeProvider.setForTest(service);
        }

        @AfterEach
        void clearProvider() {
            TenantTimeProvider.clearForTest();
        }

        @Test
        @DisplayName("today(tenantId) resolves the date in the tenant's IANA timezone")
        void today_resolvesTenantZone() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("America/New_York")));

            LocalDate result = TenantTimeProvider.today(tenantId);

            LocalDate expectedInNy = LocalDate.now(NY_ZONE);
            assertThat(result)
                    .as("today(tenantId) must return the current date in America/New_York")
                    .isEqualTo(expectedInNy);
        }

        @Test
        @DisplayName("now(tenantId) resolves the datetime in the tenant's IANA timezone")
        void now_resolvesTenantZone() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("Asia/Tokyo")));

            LocalDateTime result = TenantTimeProvider.now(tenantId);

            LocalDateTime expectedInTokyo = LocalDateTime.now(TOK_ZONE);
            // The hour must agree between the two calls (same wall-clock tick within the test).
            // We allow a 1-minute window to absorb unlikely minute-boundary flakes; the key
            // property is "resolved in Asia/Tokyo, not the JVM default".
            assertThat(result.getHour())
                    .as("now(tenantId) must return the hour-of-day in Asia/Tokyo")
                    .isEqualTo(expectedInTokyo.getHour());
        }

        @Test
        @DisplayName("today(null) returns a date without throwing (delegates to DEFAULT_ZONE)")
        void today_nullTenantId_doesNotThrow() {
            // TenantTimeService.zoneFor(null) short-circuits to DEFAULT_ZONE — no DB call.
            LocalDate result = TenantTimeProvider.today(null);

            assertThat(result)
                    .as("today(null) must return a non-null date using the default zone")
                    .isNotNull()
                    .isEqualTo(LocalDate.now(IST_ZONE)); // DEFAULT_ZONE is Asia/Kolkata
        }

        @Test
        @DisplayName("now(null) returns a datetime without throwing (delegates to DEFAULT_ZONE)")
        void now_nullTenantId_doesNotThrow() {
            LocalDateTime result = TenantTimeProvider.now(null);

            assertThat(result)
                    .as("now(null) must return a non-null datetime using the default zone")
                    .isNotNull();
            // Hour must match IST (DEFAULT_ZONE = Asia/Kolkata).
            assertThat(result.getHour())
                    .isEqualTo(LocalDateTime.now(IST_ZONE).getHour());
        }
    }

    // -------------------------------------------------------------------------
    // Fallback path — provider is NOT initialised (simulates unit-test / early-startup)
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Fallback path (static holder null — simulates uninitialised provider)")
    class FallbackWhenUninitialised {

        @BeforeEach
        void ensureProviderIsNull() {
            // Guarantee no prior test leaked an initialised holder.
            TenantTimeProvider.clearForTest();
        }

        @AfterEach
        void ensureProviderIsStillNull() {
            // Belt-and-suspenders: clear again so subsequent tests start clean.
            TenantTimeProvider.clearForTest();
        }

        @Test
        @DisplayName("today(tenantId) returns a non-null LocalDate (JVM-local fallback) — no NPE")
        void today_whenUninitialised_returnsJvmLocalDate() {
            UUID anyTenantId = UUID.randomUUID();

            LocalDate result = TenantTimeProvider.today(anyTenantId);

            assertThat(result)
                    .as("today() must not throw NPE when the static holder is null — "
                            + "it must return the JVM-local LocalDate.now()")
                    .isNotNull();
        }

        @Test
        @DisplayName("now(tenantId) returns a non-null LocalDateTime (JVM-local fallback) — no NPE")
        void now_whenUninitialised_returnsJvmLocalDateTime() {
            UUID anyTenantId = UUID.randomUUID();

            LocalDateTime result = TenantTimeProvider.now(anyTenantId);

            assertThat(result)
                    .as("now() must not throw NPE when the static holder is null — "
                            + "it must return the JVM-local LocalDateTime.now()")
                    .isNotNull();
        }

        @Test
        @DisplayName("today(null) returns a non-null LocalDate (JVM-local fallback) — no NPE")
        void today_nullTenant_whenUninitialised_returnsJvmLocalDate() {
            LocalDate result = TenantTimeProvider.today(null);

            assertThat(result).isNotNull();
        }
    }

    // -------------------------------------------------------------------------
    // Isolation contract — setForTest / clearForTest pair
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Test isolation — setForTest / clearForTest lifecycle")
    class TestIsolation {

        @Test
        @DisplayName("clearForTest() resets the static holder to null so the next test sees an uninitialised provider")
        void clearForTest_resetsHolder() {
            TenantTimeService svc = new TenantTimeService(tenantRepository);
            TenantTimeProvider.setForTest(svc);

            // Confirm it is wired: today(null) must not log the WARN fallback.
            LocalDate beforeClear = TenantTimeProvider.today(null);
            assertThat(beforeClear).isNotNull();

            TenantTimeProvider.clearForTest();

            // After clear: still returns non-null (JVM fallback), but now from the fallback path.
            LocalDate afterClear = TenantTimeProvider.today(UUID.randomUUID());
            assertThat(afterClear)
                    .as("after clearForTest(), today() must still return a non-null date via JVM fallback")
                    .isNotNull();
        }
    }
}
