package com.nulogic.infrastructure.kafka;

import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.kafka.events.BaseKafkaEvent;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.UUID;

/**
 * Aspect that establishes {@link TenantContext} on every {@code @KafkaListener}
 * invocation from the event envelope, before the handler body runs, and clears
 * it (plus MDC) in {@code finally}.
 *
 * <p><strong>Why this aspect exists (T1-02):</strong> Every consumer previously
 * had to remember to call {@code TenantContext.setCurrentTenant(event.getTenantId())}
 * in a try/finally. A missing call meant the RLS permissive fallback
 * ({@code OR current_setting('app.current_tenant_id', true) IS NULL}, T1-01)
 * returned all tenants — silent cross-tenant data leak.</p>
 *
 * <p><strong>Layered defense:</strong> This aspect complements
 * {@code TenantContextRecordInterceptor}, which is wired into the
 * Spring-Kafka container factories. The interceptor catches the common case
 * (typed {@code BaseKafkaEvent} payloads on the standard factories); the
 * aspect catches anything that bypasses or post-dates the container wiring —
 * new factory beans that forget {@code setRecordInterceptor}, future batch
 * listeners, or test harnesses that invoke the listener method directly.
 * Setting the same tenant UUID twice is a no-op; clearing twice is a no-op.</p>
 *
 * <p><strong>MDC:</strong> The aspect also publishes {@code tenantId} to MDC so
 * that every log line emitted inside the handler is correlated with its
 * originating tenant, and removes it in {@code finally} to avoid leaking
 * across pool threads.</p>
 *
 * <p><strong>Missing tenantId handling:</strong> If the event payload exposes
 * a {@code getTenantId()} that returns {@code null} — or has no such method —
 * the aspect logs a WARN naming the consumer method and proceeds without
 * setting the context. This matches the existing behavior of consumers
 * ({@code if (tenantId != null) setCurrentTenant(tenantId)}) and the
 * {@link com.nulogic.infrastructure.kafka.TenantContextRecordInterceptor}.
 * Per-message error semantics (acknowledge vs. retry vs. DLT) remain the
 * responsibility of the consumer body — see {@code ApprovalEventConsumer}
 * for the established malformed-event handling pattern.</p>
 */
@Slf4j
@Aspect
@Component
public class TenantContextKafkaAspect {

    private static final String MDC_TENANT_KEY = "tenantId";

    @Around("@annotation(org.springframework.kafka.annotation.KafkaListener)")
    public Object aroundKafkaListener(ProceedingJoinPoint joinPoint) throws Throwable {
        Object[] args = joinPoint.getArgs();
        UUID tenantId = extractTenantId(args);

        String methodName = methodLabel(joinPoint);
        boolean tenantSet = false;
        boolean mdcSet = false;

        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
            tenantSet = true;
            MDC.put(MDC_TENANT_KEY, tenantId.toString());
            mdcSet = true;
        } else {
            log.warn("Kafka listener {} invoked without tenantId on payload; "
                    + "proceeding without tenant context (consumer must handle malformed envelope)",
                    methodName);
        }

        try {
            return joinPoint.proceed();
        } finally {
            if (tenantSet) {
                TenantContext.clear();
            }
            if (mdcSet) {
                MDC.remove(MDC_TENANT_KEY);
            }
        }
    }

    /**
     * Pull the tenantId from the first argument that looks like an event
     * envelope. Prefers the typed {@link BaseKafkaEvent} contract; falls back
     * to reflection on {@code getTenantId()} so future event shapes that
     * don't extend {@code BaseKafkaEvent} still get propagation.
     */
    private UUID extractTenantId(Object[] args) {
        if (args == null) {
            return null;
        }
        for (Object arg : args) {
            if (arg instanceof BaseKafkaEvent event) {
                return event.getTenantId();
            }
        }
        // Reflective fallback — first arg with a no-arg getTenantId() returning UUID
        if (args.length > 0 && args[0] != null) {
            return reflectTenantId(args[0]);
        }
        return null;
    }

    private UUID reflectTenantId(Object payload) {
        try {
            Method getter = payload.getClass().getMethod("getTenantId");
            Object value = getter.invoke(payload);
            if (value instanceof UUID uuid) {
                return uuid;
            }
            if (value instanceof String str && !str.isBlank()) {
                return UUID.fromString(str);
            }
        } catch (NoSuchMethodException ignored) {
            // payload doesn't expose tenant — caller will WARN
        } catch (ReflectiveOperationException | IllegalArgumentException e) {
            log.debug("Unable to reflectively read tenantId from {}: {}",
                    payload.getClass().getSimpleName(), e.getMessage());
        }
        return null;
    }

    private String methodLabel(ProceedingJoinPoint joinPoint) {
        MethodSignature sig = (MethodSignature) joinPoint.getSignature();
        return sig.getDeclaringType().getSimpleName() + "#" + sig.getName();
    }
}
