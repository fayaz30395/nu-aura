package com.hrms.common.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for tenant isolation mechanisms.
 *
 * <p>These tests verify that:
 * <ul>
 *   <li>TenantContext.requireCurrentTenant() throws when tenant is not set</li>
 *   <li>TenantContext properly stores and retrieves tenant IDs</li>
 *   <li>Thread-local isolation works correctly</li>
 * </ul>
 *
 * <p><strong>SECURITY:</strong> These tests serve as regression guards to ensure
 * tenant isolation cannot be accidentally bypassed.</p>
 */
class TenantIsolationTest {

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Nested
    @DisplayName("TenantContext.requireCurrentTenant()")
    class RequireCurrentTenantTests {

        @Test
        @DisplayName("should throw IllegalStateException when tenant context is not set")
        void requireCurrentTenant_ThrowsWhenNotSet() {
            // Ensure context is clear
            TenantContext.clear();

            // Verify that requireCurrentTenant throws
            assertThatThrownBy(TenantContext::requireCurrentTenant)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Tenant context not set");
        }

        @Test
        @DisplayName("should return tenant ID when properly set")
        void requireCurrentTenant_ReturnsTenantIdWhenSet() {
            UUID tenantId = UUID.randomUUID();
            TenantContext.setCurrentTenant(tenantId);

            UUID result = TenantContext.requireCurrentTenant();

            assertThat(result).isEqualTo(tenantId);
        }

        @Test
        @DisplayName("should throw after context is cleared")
        void requireCurrentTenant_ThrowsAfterClear() {
            UUID tenantId = UUID.randomUUID();
            TenantContext.setCurrentTenant(tenantId);

            // Verify it works
            assertThat(TenantContext.requireCurrentTenant()).isEqualTo(tenantId);

            // Clear and verify it throws
            TenantContext.clear();

            assertThatThrownBy(TenantContext::requireCurrentTenant)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Tenant context not set");
        }
    }

    @Nested
    @DisplayName("TenantContext.getCurrentTenant()")
    class GetCurrentTenantTests {

        @Test
        @DisplayName("should return null when tenant context is not set")
        void getCurrentTenant_ReturnsNullWhenNotSet() {
            TenantContext.clear();

            UUID result = TenantContext.getCurrentTenant();

            assertThat(result).isNull();
        }

        @Test
        @DisplayName("should return tenant ID when properly set")
        void getCurrentTenant_ReturnsTenantIdWhenSet() {
            UUID tenantId = UUID.randomUUID();
            TenantContext.setCurrentTenant(tenantId);

            UUID result = TenantContext.getCurrentTenant();

            assertThat(result).isEqualTo(tenantId);
        }
    }

    @Nested
    @DisplayName("Thread-local isolation")
    class ThreadLocalIsolationTests {

        @Test
        @DisplayName("should isolate tenant context between threads")
        void tenantContext_IsolatedBetweenThreads() throws InterruptedException {
            UUID tenant1 = UUID.randomUUID();
            UUID tenant2 = UUID.randomUUID();

            // Set tenant in main thread
            TenantContext.setCurrentTenant(tenant1);

            // Holder for other thread's tenant
            final UUID[] otherThreadTenant = new UUID[1];
            final UUID[] otherThreadRequireResult = new UUID[1];
            final Exception[] otherThreadException = new Exception[1];

            // Create another thread with different tenant
            Thread otherThread = new Thread(() -> {
                try {
                    // Should be null initially (thread-local isolation)
                    otherThreadTenant[0] = TenantContext.getCurrentTenant();

                    // Set a different tenant
                    TenantContext.setCurrentTenant(tenant2);
                    otherThreadRequireResult[0] = TenantContext.requireCurrentTenant();
                } catch (Exception e) {
                    otherThreadException[0] = e;
                } finally {
                    TenantContext.clear();
                }
            });

            otherThread.start();
            otherThread.join();

            // Verify no exception in other thread
            assertThat(otherThreadException[0]).isNull();

            // Verify other thread started with null (isolation)
            assertThat(otherThreadTenant[0]).isNull();

            // Verify other thread had its own tenant set
            assertThat(otherThreadRequireResult[0]).isEqualTo(tenant2);

            // Verify main thread's tenant is unchanged
            assertThat(TenantContext.requireCurrentTenant()).isEqualTo(tenant1);
        }
    }

    @Nested
    @DisplayName("Defensive programming patterns")
    class DefensivePatternsTests {

        @Test
        @DisplayName("requireCurrentTenant should be preferred over getCurrentTenant in service code")
        void documentPreferredPattern() {
            // This test documents the preferred pattern for service code

            // BAD PATTERN: Can silently pass null to queries
            // UUID tenantId = TenantContext.getCurrentTenant();
            // repository.findByTenantId(tenantId); // Could pass null!

            // GOOD PATTERN: Fails fast if tenant context is missing
            // UUID tenantId = TenantContext.requireCurrentTenant();
            // repository.findByTenantId(tenantId); // Guaranteed non-null

            // Verify the good pattern fails appropriately
            TenantContext.clear();
            assertThatThrownBy(TenantContext::requireCurrentTenant)
                    .isInstanceOf(IllegalStateException.class);

            // And works when set
            UUID tenantId = UUID.randomUUID();
            TenantContext.setCurrentTenant(tenantId);
            assertThat(TenantContext.requireCurrentTenant()).isNotNull();
        }

        @Test
        @DisplayName("null tenant ID cannot be set as valid context")
        void nullTenantId_CannotBypassValidation() {
            // If someone tries to set null as tenant ID
            TenantContext.setCurrentTenant(null);

            // requireCurrentTenant should still throw
            assertThatThrownBy(TenantContext::requireCurrentTenant)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Tenant context not set");
        }
    }
}
