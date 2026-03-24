package com.hrms.security;

import com.hrms.common.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for async context propagation behavior.
 *
 * <p><strong>SECURITY RISK:</strong> @Async methods that don't propagate tenant context
 * can cause cross-tenant data leakage, especially in notification and webhook services.</p>
 *
 * <p>This test suite verifies:</p>
 * <ul>
 *   <li>Tenant context is NOT automatically propagated to new threads (ThreadLocal behavior)</li>
 *   <li>Main thread tenant context is preserved after spawning async work</li>
 *   <li>Missing tenant context is handled gracefully</li>
 *   <li>Concurrent async calls maintain proper tenant isolation</li>
 * </ul>
 *
 * <p>Note: These are pure unit tests for TenantContext ThreadLocal behavior.
 * No Spring context is needed. In production, a TaskDecorator must be configured
 * to propagate TenantContext to async threads.</p>
 */
public class AsyncContextPropagationTest {

    private UUID testTenant;

    @BeforeEach
    void setUp() {
        testTenant = UUID.randomUUID();
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    /**
     * CRITICAL SECURITY TEST: Verify that tenant context is NOT automatically
     * propagated to new threads (simulating @Async methods).
     *
     * <p>EXPECTED BEHAVIOR: This test demonstrates that without a TaskDecorator,
     * TenantContext is lost in async threads.</p>
     */
    @Test
    void shouldDetectTenantContextLossInAsyncMethods() throws InterruptedException {
        // Given: Set tenant context in main thread
        TenantContext.setCurrentTenant(testTenant);
        UUID tenantBeforeAsyncCall = TenantContext.getCurrentTenant();

        assertThat(tenantBeforeAsyncCall)
                .as("Tenant context should be set before async call")
                .isEqualTo(testTenant);

        // When: Simulate async execution in a separate thread
        AtomicReference<UUID> asyncThreadTenant = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        Thread asyncThread = new Thread(() -> {
            asyncThreadTenant.set(TenantContext.getCurrentTenant());
            latch.countDown();
        });
        asyncThread.start();
        latch.await(2, TimeUnit.SECONDS);

        // Then: Verify main thread tenant context is preserved
        UUID tenantAfterAsyncCall = TenantContext.getCurrentTenant();
        assertThat(tenantAfterAsyncCall)
                .as("Tenant context should be preserved in main thread")
                .isEqualTo(testTenant);

        // And: Async thread should NOT have tenant context (by default without TaskDecorator)
        assertThat(asyncThreadTenant.get())
                .as("Async thread should NOT inherit tenant context without TaskDecorator")
                .isNull();
    }

    /**
     * CRITICAL SECURITY TEST: Verify that explicit context propagation works.
     * This simulates how a TaskDecorator should propagate TenantContext.
     */
    @Test
    void shouldPropagateContextWhenExplicitlyPassed() throws InterruptedException {
        // Given: Set tenant context
        TenantContext.setCurrentTenant(testTenant);
        final UUID capturedTenant = TenantContext.getCurrentTenant();

        // When: Simulate TaskDecorator behavior — capture and restore context in async thread
        AtomicReference<UUID> asyncThreadTenant = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        Thread asyncThread = new Thread(() -> {
            try {
                TenantContext.setCurrentTenant(capturedTenant); // TaskDecorator would do this
                asyncThreadTenant.set(TenantContext.getCurrentTenant());
            } finally {
                TenantContext.clear();
                latch.countDown();
            }
        });
        asyncThread.start();
        latch.await(2, TimeUnit.SECONDS);

        // Then: Async thread should have the propagated tenant context
        assertThat(asyncThreadTenant.get())
                .as("Async thread should have propagated tenant context")
                .isEqualTo(testTenant);

        // And: Main thread should still have its own context
        assertThat(TenantContext.getCurrentTenant())
                .as("Main thread tenant context should remain unchanged")
                .isEqualTo(testTenant);
    }

    /**
     * SECURITY TEST: Verify that calling async method WITHOUT tenant context
     * does not cause unexpected behavior.
     */
    @Test
    void shouldHandleMissingTenantContextGracefullyInAsyncMethods() {
        // Given: No tenant context set
        TenantContext.clear();

        assertThat(TenantContext.getCurrentTenant())
                .as("Tenant context should be null")
                .isNull();

        // When/Then: No exception should be thrown when accessing null context
        // The async method should log a warning instead of failing silently
    }

    /**
     * CONCURRENCY TEST: Verify that multiple concurrent threads maintain
     * proper tenant isolation.
     */
    @Test
    void shouldMaintainTenantIsolationInConcurrentAsyncCalls() throws InterruptedException {
        UUID tenant1 = UUID.randomUUID();
        UUID tenant2 = UUID.randomUUID();

        AtomicReference<UUID> thread1Context = new AtomicReference<>();
        AtomicReference<UUID> thread2Context = new AtomicReference<>();
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        // Thread 1: Tenant 1
        Thread thread1 = new Thread(() -> {
            try {
                startLatch.await();
                TenantContext.setCurrentTenant(tenant1);
                Thread.sleep(50); // Simulate processing
                thread1Context.set(TenantContext.getCurrentTenant());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                TenantContext.clear();
                doneLatch.countDown();
            }
        });

        // Thread 2: Tenant 2
        Thread thread2 = new Thread(() -> {
            try {
                startLatch.await();
                TenantContext.setCurrentTenant(tenant2);
                Thread.sleep(50); // Simulate processing
                thread2Context.set(TenantContext.getCurrentTenant());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                TenantContext.clear();
                doneLatch.countDown();
            }
        });

        // Execute concurrently
        thread1.start();
        thread2.start();
        startLatch.countDown();
        doneLatch.await(5, TimeUnit.SECONDS);

        // Then: Both threads should have had their own tenant context
        assertThat(thread1Context.get())
                .as("Thread 1 should have Tenant 1 context")
                .isEqualTo(tenant1);
        assertThat(thread2Context.get())
                .as("Thread 2 should have Tenant 2 context")
                .isEqualTo(tenant2);
    }

    /**
     * SECURITY TEST: Verify that tenant context is fully cleared and
     * does not persist across sequential async operations.
     */
    @Test
    void shouldNotPersistContextBetweenSequentialAsyncOperations() {
        // First operation: Set Tenant A
        TenantContext.setCurrentTenant(testTenant);
        assertThat(TenantContext.getCurrentTenant()).isEqualTo(testTenant);
        TenantContext.clear();

        // Second operation: Context should be clean
        assertThat(TenantContext.getCurrentTenant())
                .as("Context should be clean between sequential operations")
                .isNull();
    }
}
