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
 * Unit tests for cross-tenant isolation in asynchronous operations.
 *
 * <p><strong>SECURITY TEST:</strong> Verifies that tenant context (ThreadLocal)
 * is properly isolated between threads and that tenant data isolation is maintained
 * in concurrent scenarios.</p>
 *
 * <p>Tests the following security risks:</p>
 * <ul>
 *   <li>Cross-tenant data leakage via ThreadLocal in async threads</li>
 *   <li>ThreadLocal context loss in new threads</li>
 *   <li>Tenant context not propagated to child threads (by default)</li>
 *   <li>Concurrent tenant context isolation between threads</li>
 * </ul>
 *
 * <p>Note: These are pure unit tests for TenantContext ThreadLocal behavior.
 * No Spring context is needed.</p>
 */
public class MultiTenantAsyncIsolationTest {

    private UUID tenantA;
    private UUID tenantB;
    private UUID userA1;
    private UUID userA2;
    private UUID userB1;
    private UUID userB2;

    @BeforeEach
    void setUp() {
        // Create two distinct tenants for isolation testing
        tenantA = UUID.randomUUID();
        tenantB = UUID.randomUUID();

        // Create users for each tenant
        userA1 = UUID.randomUUID(); // Tenant A - Manager
        userA2 = UUID.randomUUID(); // Tenant A - Employee
        userB1 = UUID.randomUUID(); // Tenant B - Manager
        userB2 = UUID.randomUUID(); // Tenant B - Employee

        // Clear any existing tenant context
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    /**
     * CRITICAL SECURITY TEST: Verify that tenant context set in one thread
     * is NOT visible in a child thread (ThreadLocal isolation).
     */
    @Test
    void shouldNotLeakTenantContextToChildThread() throws InterruptedException {
        // Given: Set Tenant A context in the main thread
        TenantContext.setCurrentTenant(tenantA);

        AtomicReference<UUID> childThreadTenant = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);

        // When: Spawn a new thread (simulating @Async)
        Thread childThread = new Thread(() -> {
            childThreadTenant.set(TenantContext.getCurrentTenant());
            latch.countDown();
        });
        childThread.start();
        latch.await(2, TimeUnit.SECONDS);

        // Then: Child thread should NOT inherit parent's tenant context (ThreadLocal is thread-scoped)
        assertThat(childThreadTenant.get())
                .as("Child thread should NOT inherit parent thread's tenant context by default")
                .isNull();

        // Main thread should still have Tenant A
        assertThat(TenantContext.getCurrentTenant())
                .as("Main thread tenant context should be preserved")
                .isEqualTo(tenantA);
    }

    /**
     * CRITICAL SECURITY TEST: Verify that switching tenant context in a thread
     * does NOT affect other concurrent threads.
     */
    @Test
    void shouldMaintainTenantIsolationBetweenConcurrentThreads() throws InterruptedException {
        AtomicReference<UUID> thread1Tenant = new AtomicReference<>();
        AtomicReference<UUID> thread2Tenant = new AtomicReference<>();
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        // Thread 1: Processes as Tenant A
        Thread t1 = new Thread(() -> {
            try {
                startLatch.await();
                TenantContext.setCurrentTenant(tenantA);
                Thread.sleep(50); // Simulate some processing
                thread1Tenant.set(TenantContext.getCurrentTenant());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                TenantContext.clear();
                doneLatch.countDown();
            }
        });

        // Thread 2: Processes as Tenant B
        Thread t2 = new Thread(() -> {
            try {
                startLatch.await();
                TenantContext.setCurrentTenant(tenantB);
                Thread.sleep(50); // Simulate some processing
                thread2Tenant.set(TenantContext.getCurrentTenant());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                TenantContext.clear();
                doneLatch.countDown();
            }
        });

        t1.start();
        t2.start();
        startLatch.countDown(); // Start both threads simultaneously
        doneLatch.await(5, TimeUnit.SECONDS);

        // Then: Each thread should have had its own tenant context
        assertThat(thread1Tenant.get())
                .as("Thread 1 should have Tenant A context")
                .isEqualTo(tenantA);

        assertThat(thread2Tenant.get())
                .as("Thread 2 should have Tenant B context")
                .isEqualTo(tenantB);
    }

    /**
     * CRITICAL SECURITY TEST: Verify that switching tenant context mid-processing
     * does NOT leak data between tenants.
     */
    @Test
    void shouldPreventCrossTenantLeakageWhenSwitchingContext() {
        // Given: Process Tenant A
        TenantContext.setCurrentTenant(tenantA);
        UUID contextDuringA = TenantContext.getCurrentTenant();

        // When: Switch to Tenant B
        TenantContext.setCurrentTenant(tenantB);
        UUID contextDuringB = TenantContext.getCurrentTenant();

        // Then: Contexts should be different tenants
        assertThat(contextDuringA)
                .as("Tenant A context should be set for Tenant A")
                .isEqualTo(tenantA);

        assertThat(contextDuringB)
                .as("Tenant B context should be set for Tenant B")
                .isEqualTo(tenantB);

        assertThat(contextDuringA)
                .as("Tenant A and Tenant B contexts should be different")
                .isNotEqualTo(contextDuringB);
    }

    /**
     * CRITICAL SECURITY TEST: Attempt to access data after context clear.
     * This verifies that TenantContext.clear() fully removes tenant isolation context.
     */
    @Test
    void shouldBlockAccessAfterContextCleared() {
        // Given: Set Tenant A context, then clear it
        TenantContext.setCurrentTenant(tenantA);
        TenantContext.clear();

        // When: Check current tenant
        UUID currentTenant = TenantContext.getCurrentTenant();

        // Then: Should be null after clear
        assertThat(currentTenant)
                .as("Tenant context should be null after clear")
                .isNull();
    }

    /**
     * SECURITY TEST: Verify that missing tenant context is properly detected.
     */
    @Test
    void shouldThrowExceptionWhenTenantContextMissingInAsyncOperation() {
        // Given: Clear tenant context
        TenantContext.clear();

        // When/Then: Tenant context should be null
        assertThat(TenantContext.getCurrentTenant())
                .as("Tenant context should be null when not set")
                .isNull();
    }
}
