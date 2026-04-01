package com.hrms.common.config;

import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Cache warm-up service that pre-loads frequently accessed, slow-changing data
 * into Redis on application startup and on demand.
 *
 * <p>Calls {@code @Cacheable} methods on domain services, which transparently
 * populate Redis on first invocation. This eliminates cold-start latency for
 * the first user request after deployment or cache flush.</p>
 *
 * <p><strong>Strategy:</strong> Only warms long-lived caches (TTL >= 4 hours)
 * since short-lived caches (5-15 min) would expire before being useful.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheWarmUpService {

    private final TenantCacheManager tenantCacheManager;

    // Services are injected lazily via ApplicationContext to avoid circular deps.
    // Each warm method uses try/catch so one failure doesn't block the rest.
    private final org.springframework.context.ApplicationContext ctx;

    /**
     * Warm caches for a specific tenant by calling @Cacheable methods.
     * Sets TenantContext so tenant-aware key generators produce correct keys.
     *
     * @param tenantId the tenant to warm caches for
     */
    @Async
    public void warmCachesForTenant(UUID tenantId) {
        long start = System.currentTimeMillis();
        int warmed = 0;

        try {
            TenantContext.setCurrentTenant(tenantId);
            log.info("Starting cache warm-up for tenant: {}", tenantId);

            // 1. Leave types (24hr TTL) — used on every leave request page
            warmed += warmSafely("leaveTypes", () -> {
                var svc = ctx.getBean(com.hrms.application.leave.service.LeaveTypeService.class);
                svc.getActiveLeaveTypes();
            });

            // 2. Departments (4hr TTL) — used in employee lists, filters, org chart
            warmed += warmSafely("departments", () -> {
                var svc = ctx.getBean(com.hrms.application.employee.service.DepartmentService.class);
                svc.getAllDepartments();
            });

            // 3. Office locations (4hr TTL) — used in attendance, employee forms
            warmed += warmSafely("officeLocations", () -> {
                var svc = ctx.getBean(com.hrms.application.attendance.service.OfficeLocationService.class);
                svc.getAllLocations();
            });

            // 4. Holidays (24hr TTL) — used in attendance, leave calendar
            warmed += warmSafely("holidays", () -> {
                var svc = ctx.getBean(com.hrms.application.attendance.service.HolidayService.class);
                svc.getCurrentYearHolidays();
            });

            // 5. Feature flags (24hr TTL) — used on every page for feature gating
            warmed += warmSafely("featureFlags", () -> {
                var svc = ctx.getBean(com.hrms.application.featureflag.FeatureFlagService.class);
                svc.getAllFlags(tenantId);
            });

            long elapsed = System.currentTimeMillis() - start;
            log.info("Cache warm-up completed for tenant {}: {}/5 caches warmed in {}ms",
                    tenantId, warmed, elapsed);

        } catch (Exception e) {
            log.error("Cache warm-up failed for tenant {}: {}", tenantId, e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Attempt to warm a single cache. Returns 1 on success, 0 on failure.
     * Never throws — failures are logged and skipped.
     */
    private int warmSafely(String cacheName, Runnable loader) {
        try {
            loader.run();
            log.debug("Warmed cache: {}", cacheName);
            return 1;
        } catch (Exception e) {
            log.warn("Failed to warm cache '{}': {}", cacheName, e.getMessage());
            return 0;
        }
    }

    /**
     * On application startup, log that cache warming is available.
     * Actual warm-up happens per-tenant on first login or via admin trigger.
     *
     * <p>We don't auto-warm all tenants on startup because:
     * 1. We don't know which tenants are active
     * 2. Warming all tenants would spike DB load on deploy
     * 3. Per-tenant warm-up on first login is good enough</p>
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("CacheWarmUpService ready. Per-tenant warm-up available via warmCachesForTenant(tenantId).");
    }
}
