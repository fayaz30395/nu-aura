package com.nulogic.common.util;

import com.nulogic.common.entity.TenantAware;
import org.junit.jupiter.api.AfterEach;
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

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TimeAuditingEntityListener}, the Spring-managed JPA listener that stamps
 * {@code @TenantTimestamp} fields with tenant-zone "now" on {@code @PrePersist} / {@code @PreUpdate}.
 *
 * <p>This is a pure-Mockito unit test &mdash; no Spring context, no Hibernate, no Postgres.
 * The listener's only collaborators are {@link TenantTimeService} (mocked here) and reflection
 * on entity field values, both of which are exercised directly via the listener's public
 * lifecycle callbacks.</p>
 *
 * <p><strong>Static-state hygiene.</strong> {@link TimeAuditingEntityListener} holds two pieces
 * of static state: the {@code timeService} reference (set by Spring at startup) and a
 * {@code FIELD_CACHE} of {@code Class -&gt; List&lt;Field&gt;} populated lazily on first persist
 * of each entity class. Both are reset in {@link #resetStaticState()} so test order cannot leak
 * state. We rely on local fixture classes per scenario where needed (cache-hit and unsupported-type
 * tests) so the cache is observably empty at the start of each test.</p>
 *
 * <p>Coverage matrix (W7-ENTITYLISTENER-TESTS):
 * <ol>
 *   <li>null field on {@code @PrePersist} &rarr; stamps with {@code tenantTimeService.now(tenantId)}</li>
 *   <li>non-null field with {@code updateOnChange=false} &rarr; preserved on persist and update</li>
 *   <li>non-null field with {@code updateOnChange=true} on {@code @PreUpdate} &rarr; restamped</li>
 *   <li>multiple {@code @TenantTimestamp} fields in one entity &rarr; all handled (including {@link LocalDate})</li>
 *   <li>{@code tenantId == null} (entity not {@link TenantAware}) &rarr; resolveNow still works,
 *       passing {@code null} to {@link TenantTimeService} (which itself falls back to Asia/Kolkata)</li>
 *   <li>unsupported field type (e.g. {@link String}) &rarr; throws {@link IllegalStateException}</li>
 *   <li>{@code timeService == null} &rarr; WARN log + JVM-default fallback (no NPE)</li>
 *   <li>reflection cache hit on second invocation &rarr; only walks fields once per class</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("TimeAuditingEntityListener — tenant-zone @PrePersist/@PreUpdate stamping")
class TimeAuditingEntityListenerTest {

    private static final UUID TENANT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final LocalDateTime FIXED_NOW = LocalDateTime.of(2026, Month.MAY, 14, 9, 30, 0);
    private static final LocalDate FIXED_TODAY = LocalDate.of(2026, Month.MAY, 14);

    @Mock
    private TenantTimeService tenantTimeService;

    private TimeAuditingEntityListener listener;

    @BeforeEach
    void setUp() {
        listener = new TimeAuditingEntityListener();
        listener.setTimeService(tenantTimeService);
        when(tenantTimeService.now(any())).thenReturn(FIXED_NOW);
        when(tenantTimeService.today(any())).thenReturn(FIXED_TODAY);
    }

    @AfterEach
    void resetStaticState() {
        // Null out the static service so each test reasserts wiring; also clear the FIELD_CACHE
        // so the "first invocation" assertions in CacheHit are observable.
        ReflectionTestUtils.setField(TimeAuditingEntityListener.class, "timeService", null);
        @SuppressWarnings("unchecked")
        Map<Class<?>, ?> cache = (Map<Class<?>, ?>) ReflectionTestUtils.getField(
                TimeAuditingEntityListener.class, "FIELD_CACHE");
        if (cache != null) {
            cache.clear();
        }
    }

    // =====================================================================
    // Scenario 1: null field on @PrePersist
    // =====================================================================

    @Nested
    @DisplayName("@PrePersist — null field is stamped from TenantTimeService.now(tenantId)")
    class PrePersistNullField {

        @Test
        @DisplayName("null LocalDateTime field is stamped with tenantTimeService.now(tenantId)")
        void nullFieldIsStamped() {
            SinglePersistOnlyEntity entity = new SinglePersistOnlyEntity();
            entity.setTenantId(TENANT_ID);
            assertThat(entity.getReactedAt()).isNull();

            listener.onPrePersist(entity);

            assertThat(entity.getReactedAt()).isEqualTo(FIXED_NOW);
            verify(tenantTimeService, times(1)).now(TENANT_ID);
        }
    }

    // =====================================================================
    // Scenario 2: non-null field with updateOnChange=false is preserved
    // =====================================================================

    @Nested
    @DisplayName("non-null field with updateOnChange=false is preserved")
    class UpdateOnChangeFalsePreserved {

        @Test
        @DisplayName("@PrePersist: non-null field is NOT overwritten (caller-supplied value wins)")
        void prePersistPreservesNonNull() {
            LocalDateTime caller = LocalDateTime.of(2025, 1, 1, 12, 0);
            SinglePersistOnlyEntity entity = new SinglePersistOnlyEntity();
            entity.setTenantId(TENANT_ID);
            entity.setReactedAt(caller);

            listener.onPrePersist(entity);

            assertThat(entity.getReactedAt()).isEqualTo(caller);
            // Field was non-null so we never asked the service for "now".
            verify(tenantTimeService, never()).now(any());
        }

        @Test
        @DisplayName("@PreUpdate: field with updateOnChange=false is NOT touched")
        void preUpdateLeavesPersistOnlyFieldAlone() {
            LocalDateTime existing = LocalDateTime.of(2025, 1, 1, 12, 0);
            SinglePersistOnlyEntity entity = new SinglePersistOnlyEntity();
            entity.setTenantId(TENANT_ID);
            entity.setReactedAt(existing);

            listener.onPreUpdate(entity);

            assertThat(entity.getReactedAt()).isEqualTo(existing);
            verify(tenantTimeService, never()).now(any());
        }
    }

    // =====================================================================
    // Scenario 3: updateOnChange=true on @PreUpdate is restamped
    // =====================================================================

    @Nested
    @DisplayName("updateOnChange=true field is restamped on @PreUpdate")
    class UpdateOnChangeTrueRestamped {

        @Test
        @DisplayName("@PreUpdate unconditionally restamps even when field is non-null")
        void preUpdateRestampsUpdatable() {
            LocalDateTime stale = LocalDateTime.of(2025, 1, 1, 0, 0);
            UpdatableEntity entity = new UpdatableEntity();
            entity.setTenantId(TENANT_ID);
            entity.setLastTouchedAt(stale);

            listener.onPreUpdate(entity);

            assertThat(entity.getLastTouchedAt())
                    .as("updateOnChange=true field must be overwritten with the tenant-zone now")
                    .isEqualTo(FIXED_NOW);
            verify(tenantTimeService, times(1)).now(TENANT_ID);
        }
    }

    // =====================================================================
    // Scenario 4: multiple @TenantTimestamp fields in one entity
    // =====================================================================

    @Nested
    @DisplayName("multiple @TenantTimestamp fields in one entity")
    class MultipleAnnotatedFields {

        @Test
        @DisplayName("@PrePersist stamps all null fields, regardless of LocalDate vs LocalDateTime")
        void prePersistStampsAllNullFields() {
            MultiFieldEntity entity = new MultiFieldEntity();
            entity.setTenantId(TENANT_ID);
            // stampedAt (LocalDateTime, persist-only), effectiveDate (LocalDate, persist-only),
            // lastTouchedAt (LocalDateTime, updateOnChange=true) — all start null.

            listener.onPrePersist(entity);

            assertThat(entity.getStampedAt()).isEqualTo(FIXED_NOW);
            assertThat(entity.getEffectiveDate()).isEqualTo(FIXED_TODAY);
            assertThat(entity.getLastTouchedAt()).isEqualTo(FIXED_NOW);
            // 2 LocalDateTime fields stamped + 1 LocalDate field stamped.
            verify(tenantTimeService, times(2)).now(TENANT_ID);
            verify(tenantTimeService, times(1)).today(TENANT_ID);
        }

        @Test
        @DisplayName("@PreUpdate touches only updateOnChange=true fields, leaving the others alone")
        void preUpdateOnlyTouchesUpdatableFields() {
            LocalDateTime originalStamped = LocalDateTime.of(2025, 1, 1, 0, 0);
            LocalDate originalEffective = LocalDate.of(2025, 1, 1);
            LocalDateTime staleTouched = LocalDateTime.of(2025, 6, 1, 0, 0);

            MultiFieldEntity entity = new MultiFieldEntity();
            entity.setTenantId(TENANT_ID);
            entity.setStampedAt(originalStamped);
            entity.setEffectiveDate(originalEffective);
            entity.setLastTouchedAt(staleTouched);

            listener.onPreUpdate(entity);

            assertThat(entity.getStampedAt())
                    .as("stampedAt is updateOnChange=false → preserved")
                    .isEqualTo(originalStamped);
            assertThat(entity.getEffectiveDate())
                    .as("effectiveDate is updateOnChange=false → preserved")
                    .isEqualTo(originalEffective);
            assertThat(entity.getLastTouchedAt())
                    .as("lastTouchedAt is updateOnChange=true → restamped")
                    .isEqualTo(FIXED_NOW);
            verify(tenantTimeService, times(1)).now(TENANT_ID);
            verify(tenantTimeService, never()).today(any());
        }
    }

    // =====================================================================
    // Scenario 5: tenantId null → resolveNow still works, service gets null
    // =====================================================================

    @Nested
    @DisplayName("tenantId == null (no TenantAware) → service called with null")
    class TenantIdNullFallback {

        @Test
        @DisplayName("non-TenantAware entity → service.now(null) is called and value is stamped")
        void nonTenantAwareEntityStampsWithNullTenantId() {
            // Production semantics: when the entity isn't TenantAware the listener still works;
            // it passes null to TenantTimeService, which falls back to Asia/Kolkata internally.
            // The "WARN" mentioned in the test plan refers to that internal fallback, which the
            // production class delegates to TenantTimeService (see Javadoc §"Failure modes" —
            // "we do not duplicate that logging here"). We assert the contract: null tenant
            // flows through cleanly and the field is stamped.
            NonTenantEntity entity = new NonTenantEntity();
            assertThat(entity.getReactedAt()).isNull();

            listener.onPrePersist(entity);

            assertThat(entity.getReactedAt()).isEqualTo(FIXED_NOW);
            verify(tenantTimeService, times(1)).now(null);
        }
    }

    // =====================================================================
    // Scenario 5b: timeService not yet wired → JVM-default fallback (WARN path)
    // =====================================================================

    @Nested
    @DisplayName("timeService not wired → JVM-default fallback with WARN")
    class TimeServiceNotWiredFallback {

        @Test
        @DisplayName("@PrePersist still stamps a non-null value when service is unwired")
        void fallbackStampsWithJvmNowWhenServiceMissing() {
            // Simulate the "early-startup edge case": the static field is null.
            ReflectionTestUtils.setField(TimeAuditingEntityListener.class, "timeService", null);

            SinglePersistOnlyEntity entity = new SinglePersistOnlyEntity();
            entity.setTenantId(TENANT_ID);
            LocalDateTime before = LocalDateTime.now();

            listener.onPrePersist(entity);

            LocalDateTime after = LocalDateTime.now();
            // The fallback uses LocalDateTime.now() with the JVM default zone — must be between
            // the wall-clock readings we took either side of the call, and must NOT be the mock
            // value (because the mock was never consulted).
            assertThat(entity.getReactedAt())
                    .as("fallback must produce a non-null LocalDateTime in the JVM default zone")
                    .isNotNull()
                    .isNotEqualTo(FIXED_NOW)
                    .isBetween(before.minusSeconds(1), after.plusSeconds(1));
            // The mock was bypassed entirely (the static field was null).
            verify(tenantTimeService, never()).now(any());
        }
    }

    // =====================================================================
    // Scenario 6: unsupported field type → IllegalStateException
    // =====================================================================

    @Nested
    @DisplayName("@TenantTimestamp on unsupported type")
    class UnsupportedFieldType {

        @Test
        @DisplayName("@TenantTimestamp on a String field → IllegalStateException on first persist")
        void unsupportedTypeThrows() {
            UnsupportedTypeEntity entity = new UnsupportedTypeEntity();
            entity.setTenantId(TENANT_ID);

            assertThatThrownBy(() -> listener.onPrePersist(entity))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("@TenantTimestamp")
                    .hasMessageContaining("UnsupportedTypeEntity")
                    .hasMessageContaining("badField")
                    .hasMessageContaining("java.lang.String")
                    .hasMessageContaining("LocalDate and LocalDateTime");
        }
    }

    // =====================================================================
    // Scenario 7: reflection cache hit on second invocation
    // =====================================================================

    @Nested
    @DisplayName("reflection cache hit on second invocation")
    class CacheHit {

        @Test
        @DisplayName("FIELD_CACHE walks an entity class's fields once, then serves from cache")
        void fieldsScannedOncePerEntityClass() {
            @SuppressWarnings("unchecked")
            Map<Class<?>, List<Field>> cache = (Map<Class<?>, List<Field>>) ReflectionTestUtils
                    .getField(TimeAuditingEntityListener.class, "FIELD_CACHE");
            assertThat(cache)
                    .as("AfterEach should have cleared the cache before this test")
                    .isNotNull()
                    .doesNotContainKey(CacheProbeEntity.class);

            // First call — populates the cache.
            CacheProbeEntity first = new CacheProbeEntity();
            first.setTenantId(TENANT_ID);
            listener.onPrePersist(first);

            List<Field> afterFirst = cache.get(CacheProbeEntity.class);
            assertThat(afterFirst)
                    .as("first persist must populate FIELD_CACHE with the annotated fields")
                    .isNotNull()
                    .hasSize(1);
            Field cachedField = afterFirst.get(0);
            assertThat(cachedField.getName()).isEqualTo("reactedAt");

            // Second call — same class, must reuse the cached entry (no new List instance).
            CacheProbeEntity second = new CacheProbeEntity();
            second.setTenantId(TENANT_ID);
            listener.onPrePersist(second);

            List<Field> afterSecond = cache.get(CacheProbeEntity.class);
            assertThat(afterSecond)
                    .as("second persist must NOT replace the cached list — identity is the proof "
                            + "that no fresh reflection walk happened")
                    .isSameAs(afterFirst);

            // Both entities should have been stamped with the (mocked) tenant-zone now.
            assertThat(first.getReactedAt()).isEqualTo(FIXED_NOW);
            assertThat(second.getReactedAt()).isEqualTo(FIXED_NOW);
            verify(tenantTimeService, times(2)).now(TENANT_ID);
        }
    }

    // =====================================================================
    // Local fixture entities — declared package-private at the file level so each test
    // scenario gets a distinct Class key in the static FIELD_CACHE.
    // =====================================================================

    /**
     * Single {@link LocalDateTime} field, persist-only (default {@code updateOnChange=false}).
     * Mirrors the pilot entity {@code RecognitionReaction.reactedAt} from the Javadoc.
     */
    static class SinglePersistOnlyEntity extends TenantAware {
        @TenantTimestamp
        private LocalDateTime reactedAt;

        LocalDateTime getReactedAt() { return reactedAt; }
        void setReactedAt(LocalDateTime v) { this.reactedAt = v; }
    }

    /**
     * Single {@link LocalDateTime} field with {@code updateOnChange=true} —
     * mirrors the legacy {@code updatedAt = LocalDateTime.now()} pattern.
     * Field is named {@code lastTouchedAt} (not {@code updatedAt}) to avoid colliding
     * with {@link com.nulogic.common.entity.BaseEntity#getUpdatedAt()} which is
     * defined as {@code public}.
     */
    static class UpdatableEntity extends TenantAware {
        @TenantTimestamp(updateOnChange = true)
        private LocalDateTime lastTouchedAt;

        LocalDateTime getLastTouchedAt() { return lastTouchedAt; }
        void setLastTouchedAt(LocalDateTime v) { this.lastTouchedAt = v; }
    }

    /**
     * Three annotated fields covering all combinations: persist-only LocalDateTime,
     * persist-only LocalDate, and updateOnChange LocalDateTime. Field names deliberately
     * avoid {@code createdAt}/{@code updatedAt} because those clash with the public
     * accessors on {@link com.nulogic.common.entity.BaseEntity} (the super-super class).
     */
    static class MultiFieldEntity extends TenantAware {
        @TenantTimestamp
        private LocalDateTime stampedAt;

        @TenantTimestamp
        private LocalDate effectiveDate;

        @TenantTimestamp(updateOnChange = true)
        private LocalDateTime lastTouchedAt;

        LocalDateTime getStampedAt() { return stampedAt; }
        void setStampedAt(LocalDateTime v) { this.stampedAt = v; }
        LocalDate getEffectiveDate() { return effectiveDate; }
        void setEffectiveDate(LocalDate v) { this.effectiveDate = v; }
        LocalDateTime getLastTouchedAt() { return lastTouchedAt; }
        void setLastTouchedAt(LocalDateTime v) { this.lastTouchedAt = v; }
    }

    /**
     * Entity that is NOT {@link TenantAware} — exercises {@code tenantIdOf} returning null.
     * Doesn't extend {@code TenantAware} so {@code instanceof TenantAware} is false.
     */
    static class NonTenantEntity {
        @TenantTimestamp
        private LocalDateTime reactedAt;

        LocalDateTime getReactedAt() { return reactedAt; }
        @SuppressWarnings("unused")
        void setReactedAt(LocalDateTime v) { this.reactedAt = v; }
    }

    /**
     * Misuse: {@code @TenantTimestamp} on a {@link String} field. Used to assert the
     * eager-validation contract documented on {@link TenantTimestamp}.
     */
    static class UnsupportedTypeEntity extends TenantAware {
        @TenantTimestamp
        @SuppressWarnings("unused")
        private String badField;
    }

    /**
     * Distinct class used only by the FIELD_CACHE-hit assertion so the cache-identity check
     * can't be contaminated by other tests that share an entity class.
     */
    static class CacheProbeEntity extends TenantAware {
        @TenantTimestamp
        private LocalDateTime reactedAt;

        LocalDateTime getReactedAt() { return reactedAt; }
        @SuppressWarnings("unused")
        void setReactedAt(LocalDateTime v) { this.reactedAt = v; }
    }
}
