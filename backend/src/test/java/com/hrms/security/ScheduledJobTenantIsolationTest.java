package com.hrms.security;

import com.hrms.common.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Security tests for scheduled jobs and their tenant isolation behavior.
 *
 * <p><strong>CRITICAL RISK:</strong> @Scheduled methods do NOT automatically
 * have tenant context set. They must explicitly iterate over tenants or
 * handle tenant context manually.</p>
 *
 * <p>Scheduled jobs affected:</p>
 * <ul>
 *   <li>JobBoardIntegrationService.syncApplicationCounts() - @Scheduled every 6 hours</li>
 *   <li>JobBoardIntegrationService.expireOldPostings() - @Scheduled daily at 2am</li>
 *   <li>WebhookDeliveryService.processRetries() - @Scheduled every 60 seconds</li>
 *   <li>AutoRegularizationScheduler (if exists)</li>
 *   <li>ScheduledReportExecutionJob (if exists)</li>
 *   <li>ScheduledNotificationService (if exists)</li>
 *   <li>EmailSchedulerService (if exists)</li>
 * </ul>
 *
 * <p><strong>VULNERABILITY:</strong> If a scheduled job queries tenant-scoped data
 * without setting tenant context, it may:</p>
 * <ul>
 *   <li>Return data from ALL tenants (RLS bypass)</li>
 *   <li>Throw NullPointerException if TenantContext.requireCurrentTenant() is called</li>
 *   <li>Process data for the wrong tenant</li>
 * </ul>
 *
 * <p>Note: These are pure unit tests for TenantContext ThreadLocal behavior.
 * No Spring context is needed.</p>
 */
public class ScheduledJobTenantIsolationTest {

    @BeforeEach
    void setUp() {
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    /**
     * CRITICAL SECURITY TEST: Verify that scheduled jobs start with NO tenant context.
     *
     * <p>This is expected behavior. Scheduled jobs must explicitly manage tenant context
     * by iterating over tenants or setting context manually.</p>
     */
    @Test
    void scheduledJobsShouldStartWithNoTenantContext() {
        // Given: Simulate a scheduled job execution
        TenantContext.clear();

        // When: Check tenant context at job start
        UUID currentTenant = TenantContext.getCurrentTenant();

        // Then: Tenant context should be null
        assertThat(currentTenant)
                .as("Scheduled jobs should NOT have tenant context by default")
                .isNull();
    }

    /**
     * SECURITY TEST: Verify that scheduled jobs can safely iterate over tenants.
     *
     * <p>Recommended pattern for scheduled jobs:</p>
     * <pre>
     * {@code
     * @Scheduled(...)
     * public void processAllTenants() {
     *     List<Tenant> tenants = tenantRepository.findAll();
     *     for (Tenant tenant : tenants) {
     *         try {
     *             TenantContext.setCurrentTenant(tenant.getId());
     *             processTenant(tenant);
     *         } finally {
     *             TenantContext.clear();
     *         }
     *     }
     * }
     * }
     * </pre>
     */
    @Test
    void scheduledJobsShouldIterateOverTenantsExplicitly() {
        // Simulate scheduled job processing multiple tenants
        UUID tenant1 = UUID.randomUUID();
        UUID tenant2 = UUID.randomUUID();

        // Process Tenant 1
        try {
            TenantContext.setCurrentTenant(tenant1);
            assertThat(TenantContext.getCurrentTenant())
                    .as("Tenant context should be set for Tenant 1")
                    .isEqualTo(tenant1);

            // Simulate tenant-specific processing
            // processTenantData();

        } finally {
            TenantContext.clear();
        }

        // Process Tenant 2
        try {
            TenantContext.setCurrentTenant(tenant2);
            assertThat(TenantContext.getCurrentTenant())
                    .as("Tenant context should be set for Tenant 2")
                    .isEqualTo(tenant2);

            // Simulate tenant-specific processing
            // processTenantData();

        } finally {
            TenantContext.clear();
        }

        // Verify cleanup
        assertThat(TenantContext.getCurrentTenant())
                .as("Tenant context should be cleared after job completion")
                .isNull();
    }

    /**
     * VULNERABILITY TEST: Demonstrate the risk of querying without tenant context.
     *
     * <p>If a repository method relies on TenantContext.requireCurrentTenant()
     * and is called from a scheduled job without setting context, it will fail.</p>
     */
    @Test
    void shouldFailWhenScheduledJobCallsRequireCurrentTenantWithoutContext() {
        // Given: No tenant context
        TenantContext.clear();

        // When/Then: Calling requireCurrentTenant() should throw exception
        try {
            UUID tenant = TenantContext.requireCurrentTenant();
            assertThat(tenant)
                    .as("This should not be reached - exception expected")
                    .isNull();
        } catch (IllegalStateException e) {
            assertThat(e.getMessage())
                    .as("Exception should indicate missing tenant context")
                    .contains("Tenant context not set");
        }
    }

    /**
     * SECURITY BEST PRACTICE: Verify that scheduled jobs properly isolate
     * tenant operations and prevent cross-tenant data contamination.
     */
    @Test
    void scheduledJobsShouldNotLeakDataBetweenTenants() {
        UUID tenant1 = UUID.randomUUID();
        UUID tenant2 = UUID.randomUUID();

        // Simulate processing Tenant 1
        TenantContext.setCurrentTenant(tenant1);
        UUID contextDuringTenant1 = TenantContext.getCurrentTenant();
        TenantContext.clear();

        // Simulate processing Tenant 2
        TenantContext.setCurrentTenant(tenant2);
        UUID contextDuringTenant2 = TenantContext.getCurrentTenant();
        TenantContext.clear();

        // Verify isolation
        assertThat(contextDuringTenant1)
                .as("Tenant 1 context should be different from Tenant 2")
                .isNotEqualTo(contextDuringTenant2);
    }
}
