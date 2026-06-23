package com.nulogic.infrastructure.kafka;

import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.kafka.events.ApprovalEvent;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link TenantContextKafkaAspect}.
 *
 * <p>The {@link ProceedingJoinPoint} is mocked. We assert that the tenant id is
 * established in {@link TenantContext} <em>during</em> {@code proceed()} and is
 * always cleared afterward — including when the joinpoint throws.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TenantContextKafkaAspectTest {

    private final TenantContextKafkaAspect aspect = new TenantContextKafkaAspect();

    @Mock
    private ProceedingJoinPoint joinPoint;

    @Mock
    private MethodSignature signature;

    @BeforeEach
    void stubSignature() {
        // methodLabel() casts the signature to MethodSignature and reads declaring type + name.
        // Strictness.LENIENT is set at class level so these stubs are tolerated when a test
        // proceeds without ever logging (the WARN-path tests do exercise them).
        when(joinPoint.getSignature()).thenReturn(signature);
        when(signature.getDeclaringType()).thenReturn(TenantContextKafkaAspectTest.class);
        when(signature.getName()).thenReturn("listener");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // ── happy path: typed BaseKafkaEvent payload ─────────────────────────────

    @Test
    @DisplayName("sets tenant context from BaseKafkaEvent payload during proceed and clears after")
    void setsAndClearsTenantContext_fromTypedEvent() throws Throwable {
        UUID tenantId = UUID.randomUUID();
        ApprovalEvent event = new ApprovalEvent();
        event.setTenantId(tenantId);
        when(joinPoint.getArgs()).thenReturn(new Object[]{event});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return "ok";
        });

        Object result = aspect.aroundKafkaListener(joinPoint);

        assertThat(result).isEqualTo("ok");
        assertThat(duringProceed.get()).isEqualTo(tenantId);
        // Cleared in finally.
        assertThat(TenantContext.getCurrentTenant()).isNull();
        verify(joinPoint).proceed();
    }

    @Test
    @DisplayName("clears tenant context even when the joinpoint throws")
    void clearsTenantContext_whenJoinpointThrows() throws Throwable {
        UUID tenantId = UUID.randomUUID();
        ApprovalEvent event = new ApprovalEvent();
        event.setTenantId(tenantId);
        when(joinPoint.getArgs()).thenReturn(new Object[]{event});

        RuntimeException boom = new RuntimeException("handler failed");
        when(joinPoint.proceed()).thenThrow(boom);

        assertThatThrownBy(() -> aspect.aroundKafkaListener(joinPoint))
                .isSameAs(boom);

        assertThat(TenantContext.getCurrentTenant()).isNull();
        verify(joinPoint).proceed();
    }

    // ── reflective fallback ──────────────────────────────────────────────────

    @Test
    @DisplayName("extracts tenant id reflectively (UUID getTenantId) when payload is not a BaseKafkaEvent")
    void reflectiveTenantId_uuidGetter() throws Throwable {
        UUID tenantId = UUID.randomUUID();
        when(joinPoint.getArgs()).thenReturn(new Object[]{new UuidTenantPayload(tenantId)});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return null;
        });

        aspect.aroundKafkaListener(joinPoint);

        assertThat(duringProceed.get()).isEqualTo(tenantId);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("extracts tenant id reflectively when getTenantId returns a UUID string")
    void reflectiveTenantId_stringGetter() throws Throwable {
        UUID tenantId = UUID.randomUUID();
        when(joinPoint.getArgs()).thenReturn(new Object[]{new StringTenantPayload(tenantId.toString())});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return null;
        });

        aspect.aroundKafkaListener(joinPoint);

        assertThat(duringProceed.get()).isEqualTo(tenantId);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("blank string from getTenantId leaves context unset and still proceeds")
    void reflectiveTenantId_blankString_noContext() throws Throwable {
        when(joinPoint.getArgs()).thenReturn(new Object[]{new StringTenantPayload("   ")});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return null;
        });

        aspect.aroundKafkaListener(joinPoint);

        assertThat(duringProceed.get()).isNull();
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("non-UUID string from getTenantId is swallowed (IllegalArgumentException) and context stays unset")
    void reflectiveTenantId_invalidUuidString_noContext() throws Throwable {
        when(joinPoint.getArgs()).thenReturn(new Object[]{new StringTenantPayload("not-a-uuid")});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return null;
        });

        aspect.aroundKafkaListener(joinPoint);

        assertThat(duringProceed.get()).isNull();
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    // ── missing tenant handling ──────────────────────────────────────────────

    @Test
    @DisplayName("proceeds without context when payload exposes no getTenantId")
    void noGetter_proceedsWithoutContext() throws Throwable {
        when(joinPoint.getArgs()).thenReturn(new Object[]{new NoTenantPayload()});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return null;
        });

        aspect.aroundKafkaListener(joinPoint);

        assertThat(duringProceed.get()).isNull();
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("proceeds without context when typed event has a null tenant id")
    void nullTenantOnTypedEvent_proceedsWithoutContext() throws Throwable {
        ApprovalEvent event = new ApprovalEvent();
        event.setTenantId(null);
        when(joinPoint.getArgs()).thenReturn(new Object[]{event});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return null;
        });

        aspect.aroundKafkaListener(joinPoint);

        assertThat(duringProceed.get()).isNull();
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("proceeds without context when args array is null")
    void nullArgs_proceedsWithoutContext() throws Throwable {
        when(joinPoint.getArgs()).thenReturn(null);
        when(joinPoint.proceed()).thenReturn("done");

        Object result = aspect.aroundKafkaListener(joinPoint);

        assertThat(result).isEqualTo("done");
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("proceeds without context when args array is empty")
    void emptyArgs_proceedsWithoutContext() throws Throwable {
        when(joinPoint.getArgs()).thenReturn(new Object[]{});
        when(joinPoint.proceed()).thenReturn("done");

        Object result = aspect.aroundKafkaListener(joinPoint);

        assertThat(result).isEqualTo("done");
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("skips a null first arg and finds the BaseKafkaEvent later in the args")
    void firstArgNull_findsLaterEvent() throws Throwable {
        UUID tenantId = UUID.randomUUID();
        ApprovalEvent event = new ApprovalEvent();
        event.setTenantId(tenantId);
        when(joinPoint.getArgs()).thenReturn(new Object[]{null, event});

        AtomicReference<UUID> duringProceed = new AtomicReference<>();
        when(joinPoint.proceed()).thenAnswer(inv -> {
            duringProceed.set(TenantContext.getCurrentTenant());
            return null;
        });

        aspect.aroundKafkaListener(joinPoint);

        assertThat(duringProceed.get()).isEqualTo(tenantId);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    // ── test payload fixtures (no BaseKafkaEvent) ────────────────────────────

    /** Exposes a no-arg getTenantId() returning a UUID — exercises the reflective UUID branch. */
    public static class UuidTenantPayload {
        private final UUID tenantId;

        UuidTenantPayload(UUID tenantId) {
            this.tenantId = tenantId;
        }

        public UUID getTenantId() {
            return tenantId;
        }
    }

    /** Exposes a no-arg getTenantId() returning a String — exercises the reflective String branch. */
    public static class StringTenantPayload {
        private final String tenantId;

        StringTenantPayload(String tenantId) {
            this.tenantId = tenantId;
        }

        public String getTenantId() {
            return tenantId;
        }
    }

    /** No getTenantId() at all — exercises the NoSuchMethodException branch. */
    public static class NoTenantPayload {
        public String getSomethingElse() {
            return "irrelevant";
        }
    }
}
