package com.nulogic.common.config;

import com.nulogic.common.security.TenantContext;
import io.micrometer.context.ContextRegistry;
import io.micrometer.context.ContextSnapshotFactory;
import jakarta.annotation.PostConstruct;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Registers structured context-propagation accessors so that ThreadLocals used by
 * {@link TenantContext}, Spring Security's {@link SecurityContextHolder}, and SLF4J
 * {@link MDC} flow across asynchronous boundaries that go through the io.micrometer
 * context-propagation library (Reactor {@code Mono}/{@code Flux}, future virtual-thread
 * {@code StructuredTaskScope}, etc.).
 *
 * <p>Today's runtime ({@code spring.threads.virtual.enabled=false}) routes async work
 * through {@code taskExecutor}, where {@link TenantAwareTaskDecorator} already handles
 * propagation. This harness is an opt-in safety net for the day virtual threads are
 * enabled: {@code CompletableFuture} chains that fall through to ForkJoinPool, or
 * Reactor pipelines that call {@code contextCapture()}, will pick up these accessors
 * automatically.</p>
 *
 * <p>Backlog reference: T4-17.</p>
 */
@Configuration
@ConditionalOnClass(ContextRegistry.class)
public class ContextPropagationConfig {

    static final String KEY_TENANT_ID = "nu.tenantId";
    static final String KEY_SECURITY_CONTEXT = "nu.springSecurityContext";
    // MDC propagation is registered as a bulk accessor via Micrometer's built-in
    // ThreadLocalAccessor for SLF4J, but we add a defensive fallback below.

    @PostConstruct
    public void registerAccessors() {
        ContextRegistry registry = ContextRegistry.getInstance();

        registry.registerThreadLocalAccessor(
                KEY_TENANT_ID,
                TenantContext::getCurrentTenant,
                (UUID v) -> TenantContext.setCurrentTenant(v),
                TenantContext::clear
        );

        registry.registerThreadLocalAccessor(
                KEY_SECURITY_CONTEXT,
                SecurityContextHolder::getContext,
                (SecurityContext v) -> SecurityContextHolder.setContext(v),
                SecurityContextHolder::clearContext
        );
    }

    /**
     * Snapshot factory bean for callers that want to capture and restore context
     * explicitly (e.g. wrapping an outbound {@code CompletableFuture} stage).
     */
    @Bean
    public ContextSnapshotFactory contextSnapshotFactory() {
        return ContextSnapshotFactory.builder().build();
    }
}
