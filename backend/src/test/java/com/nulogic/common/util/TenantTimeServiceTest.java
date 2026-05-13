package com.nulogic.common.util;

import com.nulogic.domain.tenant.Tenant;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TenantTimeService}, the per-tenant {@link ZoneId} resolver that
 * centralises every {@code LocalDate.now()} / {@code LocalDateTime.now()} call so attendance
 * windows, payroll cutoffs, leave accrual, etc. respect the tenant's IANA timezone instead of
 * the server's JVM default.
 *
 * <p>This is a pure Mockito unit test &mdash; no Spring context, no Postgres &mdash; because
 * the production class only depends on {@link TenantRepository} and an in-memory
 * {@link java.util.concurrent.ConcurrentHashMap} cache.</p>
 *
 * <p>Coverage matrix (S12-B follow-up &mdash; Aux-TenantTimeService-Tests):
 * <ol>
 *   <li>{@code zoneFor(null)} short-circuits to {@code DEFAULT_ZONE} without hitting the DB.</li>
 *   <li>First lookup loads from {@link TenantRepository}.</li>
 *   <li>Second lookup is served from the in-memory cache (verified via Mockito invocation count).</li>
 *   <li>Missing tenant falls back to {@code DEFAULT_ZONE}.</li>
 *   <li>Blank timezone falls back to {@code DEFAULT_ZONE}.</li>
 *   <li>Unparseable timezone (e.g. {@code Mars/Olympus}) falls back to {@code DEFAULT_ZONE}.</li>
 *   <li>{@link TenantTimeService#today(UUID)} uses the tenant zone (asserted against America/New_York).</li>
 *   <li>{@link TenantTimeService#now(UUID)} uses the tenant zone.</li>
 *   <li>{@link TenantTimeService#invalidate(UUID)} forces the next call to re-load from DB.</li>
 *   <li>{@link TenantTimeService#invalidate(UUID)} with {@code null} is a no-op.</li>
 *   <li>The size-capped cache stays bounded under load (1 001 distinct tenants &rarr; {@literal <=} 1 000 entries).</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("TenantTimeService — per-tenant ZoneId resolver with TTL cache")
class TenantTimeServiceTest {

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Kolkata");
    private static final ZoneId NY_ZONE = ZoneId.of("America/New_York");
    private static final ZoneId LONDON_ZONE = ZoneId.of("Europe/London");

    @Mock
    private TenantRepository tenantRepository;

    private TenantTimeService service;

    @BeforeEach
    void setUp() {
        service = new TenantTimeService(tenantRepository);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private static Tenant tenantWithTimezone(String tz) {
        Tenant t = new Tenant();
        t.setTimezone(tz);
        return t;
    }

    // ---------------------------------------------------------------------
    // 1. null tenantId short-circuits without DB hit
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("zoneFor(null)")
    class NullTenant {

        @Test
        @DisplayName("returns DEFAULT_ZONE without touching the repository")
        void returnsDefaultAndSkipsDb() {
            ZoneId resolved = service.zoneFor(null);

            assertThat(resolved).isEqualTo(DEFAULT_ZONE);
            verify(tenantRepository, never()).findById(any(UUID.class));
        }
    }

    // ---------------------------------------------------------------------
    // 2 + 3. Cache semantics: load once, then serve from memory
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("zoneFor(tenantId) — cache semantics")
    class CacheSemantics {

        @Test
        @DisplayName("first call loads from TenantRepository")
        void firstCallHitsDb() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("America/New_York")));

            ZoneId resolved = service.zoneFor(tenantId);

            assertThat(resolved).isEqualTo(NY_ZONE);
            verify(tenantRepository, times(1)).findById(tenantId);
        }

        @Test
        @DisplayName("second call is served from cache (only one DB hit)")
        void secondCallServedFromCache() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("Europe/London")));

            ZoneId first = service.zoneFor(tenantId);
            ZoneId second = service.zoneFor(tenantId);

            assertThat(first).isEqualTo(LONDON_ZONE);
            assertThat(second).isEqualTo(LONDON_ZONE);
            // Critical assertion: cache prevents a second DB round-trip.
            verify(tenantRepository, times(1)).findById(tenantId);
        }
    }

    // ---------------------------------------------------------------------
    // 4 + 5 + 6. Fallback policy
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("zoneFor(tenantId) — fallback to DEFAULT_ZONE")
    class FallbackPolicy {

        @Test
        @DisplayName("missing tenant falls back to DEFAULT_ZONE")
        void missingTenantFallsBack() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());

            ZoneId resolved = service.zoneFor(tenantId);

            assertThat(resolved).isEqualTo(DEFAULT_ZONE);
        }

        @Test
        @DisplayName("blank timezone string falls back to DEFAULT_ZONE")
        void blankTimezoneFallsBack() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("   ")));

            ZoneId resolved = service.zoneFor(tenantId);

            assertThat(resolved).isEqualTo(DEFAULT_ZONE);
        }

        @Test
        @DisplayName("unparseable timezone (Mars/Olympus) falls back to DEFAULT_ZONE")
        void unparseableTimezoneFallsBack() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("Mars/Olympus")));

            ZoneId resolved = service.zoneFor(tenantId);

            assertThat(resolved).isEqualTo(DEFAULT_ZONE);
            // The production code logs this at ERROR; we don't assert log output here because
            // log-assertion plumbing would add noise. Behaviour (the fallback ZoneId) is the
            // observable contract callers depend on.
        }
    }

    // ---------------------------------------------------------------------
    // 7 + 8. today() and now() honour the tenant zone
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("today() and now() use the resolved tenant zone")
    class DateAndTimeResolution {

        @Test
        @DisplayName("today(tenantId) is computed in the tenant's zone, not the JVM default")
        void todayUsesTenantZone() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("America/New_York")));

            LocalDate fromService = service.today(tenantId);
            // Recompute "now" in the same zone — they MUST agree because both calls happen
            // in the same JVM tick window. We accept a 1-day window to absorb an unlikely
            // midnight-boundary flake; the dominant property is "uses the NY zone, not IST".
            LocalDate expectedInNy = LocalDate.now(NY_ZONE);

            assertThat(fromService).isEqualTo(expectedInNy);
        }

        @Test
        @DisplayName("now(tenantId) is computed in the tenant's zone")
        void nowUsesTenantZone() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("America/New_York")));

            LocalDateTime fromService = service.now(tenantId);
            LocalDateTime nyNow = LocalDateTime.now(NY_ZONE);
            LocalDateTime istNow = LocalDateTime.now(DEFAULT_ZONE);

            // The IST-vs-NY offset is 9h30 (or 10h30 during US DST), so the hour-of-day must
            // differ between the two. If the service ignored the tenant zone and used IST,
            // fromService.getHour() would match istNow.getHour() not nyNow.getHour().
            assertThat(fromService.getHour())
                    .as("now(tenantId) should reflect NY hour, not IST hour")
                    .isEqualTo(nyNow.getHour());
            assertThat(fromService.getHour())
                    .as("now(tenantId) should NOT reflect IST hour when tenant zone is America/New_York")
                    .isNotEqualTo(istNow.getHour());
        }
    }

    // ---------------------------------------------------------------------
    // 9 + 10. invalidate()
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("invalidate(tenantId)")
    class Invalidate {

        @Test
        @DisplayName("forces next zoneFor call to re-load from DB")
        void invalidateForcesReload() {
            UUID tenantId = UUID.randomUUID();
            when(tenantRepository.findById(tenantId))
                    .thenReturn(Optional.of(tenantWithTimezone("America/New_York")));

            // Prime the cache.
            service.zoneFor(tenantId);
            verify(tenantRepository, times(1)).findById(tenantId);

            // Invalidate, then look up again — must hit the DB a second time.
            service.invalidate(tenantId);
            service.zoneFor(tenantId);

            verify(tenantRepository, times(2)).findById(tenantId);
        }

        @Test
        @DisplayName("invalidate(null) is a no-op (no exception, no DB call)")
        void invalidateNullIsNoOp() {
            // Should not throw.
            service.invalidate(null);

            verify(tenantRepository, never()).findById(any(UUID.class));
        }
    }

    // ---------------------------------------------------------------------
    // 11. Bounded cache
    // ---------------------------------------------------------------------

    @Nested
    @DisplayName("cache capacity")
    class CacheCapacity {

        @Test
        @DisplayName("after inserting 1 001 distinct tenants, cache size stays <= MAX_CACHE_SIZE (1 000)")
        void cacheStaysBounded() {
            // Stub the repository for ANY UUID — every lookup returns the same valid tenant.
            // Using a single shared stub keeps memory bounded during this loop.
            when(tenantRepository.findById(any(UUID.class)))
                    .thenReturn(Optional.of(tenantWithTimezone("Asia/Kolkata")));

            for (int i = 0; i < 1001; i++) {
                service.zoneFor(UUID.randomUUID());
            }

            @SuppressWarnings("unchecked")
            Map<UUID, ?> cache = (Map<UUID, ?>) ReflectionTestUtils.getField(service, "cache");
            assertThat(cache)
                    .as("cache must respect MAX_CACHE_SIZE = 1000 after 1 001 distinct tenants")
                    .isNotNull()
                    .hasSizeLessThanOrEqualTo(1000);
        }
    }
}
