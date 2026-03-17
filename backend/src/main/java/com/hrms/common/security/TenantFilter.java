package com.hrms.common.security;

import com.hrms.infrastructure.tenant.repository.TenantRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Servlet filter that extracts and validates the tenant ID from the incoming request header.
 *
 * <p>The tenant ID is read from the header identified by {@code app.tenant.header-name}
 * (default: {@code X-Tenant-ID}). If validation is enabled the tenant UUID is checked
 * against the database; the result is cached to avoid a DB round-trip on every request.
 *
 * <h3>Cache design</h3>
 * <ul>
 *   <li>Valid tenant IDs are stored in an in-memory {@link Set} for O(1) lookup.</li>
 *   <li>The cache is <b>fully refreshed every {@value #CACHE_REFRESH_INTERVAL_MS} ms</b>
 *       (default 30 minutes). This ensures that deactivated or deleted tenants are
 *       eventually evicted without requiring an explicit admin call.</li>
 *   <li>A <b>hard size limit</b> of {@value #MAX_CACHE_SIZE} entries prevents unbounded
 *       growth in systems with extremely high tenant churn. Once the limit is hit the
 *       entire cache is cleared and rebuilt on the next request.</li>
 * </ul>
 *
 * <p>Individual entries can still be invalidated immediately via
 * {@link #invalidateTenant(UUID)} (called from {@code TenantController} on
 * deactivation / deletion).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TenantFilter extends OncePerRequestFilter {

    private final TenantRepository tenantRepository;

    /** Maximum number of entries in the valid-tenant cache before a full reset is forced. */
    private static final int MAX_CACHE_SIZE = 10_000;

    /** Cache full-refresh interval in milliseconds (5 minutes — reduced from 30 to limit stale tenant data). */
    private static final long CACHE_REFRESH_INTERVAL_MS = 5 * 60 * 1_000L;

    @Value("${app.tenant.header-name}")
    private String tenantHeader;

    @Value("${app.tenant.validation.enabled:true}")
    private boolean tenantValidationEnabled;

    /**
     * Cache of validated tenant UUIDs.
     * Entries are added on first successful DB lookup and evicted on a scheduled refresh
     * or via {@link #invalidateTenant(UUID)}.
     */
    private final Set<UUID> validTenantCache = ConcurrentHashMap.newKeySet();

    /** Epoch-ms of the last scheduled cache-clear. Used only for logging. */
    private final AtomicLong lastFullRefresh = new AtomicLong(System.currentTimeMillis());

    // ─────────────────────────────────────────────────────────────────────────
    // Filter logic
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String tenantId = request.getHeader(tenantHeader);
            if (tenantId != null && !tenantId.isEmpty()) {
                UUID tenant;
                try {
                    tenant = UUID.fromString(tenantId);
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid tenant ID format in header: {}", tenantId);
                    response.setStatus(HttpStatus.BAD_REQUEST.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Invalid tenant ID format\"}");
                    return;
                }

                // Validate tenant exists (with caching) unless disabled (e.g., tests)
                if (tenantValidationEnabled && !isValidTenant(tenant)) {
                    log.warn("Tenant not found or inactive: {}", tenantId);
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Invalid or inactive tenant\"}");
                    return;
                }

                TenantContext.setCurrentTenant(tenant);
                // Mirror into the shared-module TenantContext used by PSA / PM modules
                com.nulogic.common.security.TenantContext.setCurrentTenant(tenant);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            com.nulogic.common.security.TenantContext.clear();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cache management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns {@code true} if the tenant UUID is known to be valid.
     * Consults the in-memory cache first; falls back to the database on cache miss.
     */
    private boolean isValidTenant(UUID tenantId) {
        if (validTenantCache.contains(tenantId)) {
            return true;
        }

        // Guard against unbounded growth (should rarely trigger with the scheduled refresh)
        if (validTenantCache.size() >= MAX_CACHE_SIZE) {
            log.warn("TenantFilter cache reached {} entries — clearing before adding new entry", MAX_CACHE_SIZE);
            validTenantCache.clear();
        }

        boolean exists = tenantRepository.existsById(tenantId);
        if (exists) {
            validTenantCache.add(tenantId);
        }
        return exists;
    }

    /**
     * Scheduled full cache refresh — clears all cached tenant IDs every
     * {@value #CACHE_REFRESH_INTERVAL_MS} ms. Ensures that deactivated tenants
     * are eventually expelled without requiring an explicit invalidation call.
     *
     * <p>After this runs, the next request for each tenant will re-validate against
     * the database and re-populate the cache. The cost is at most one extra DB query
     * per active tenant within the first request after a refresh.
     */
    @Scheduled(fixedRate = CACHE_REFRESH_INTERVAL_MS)
    public void scheduledCacheRefresh() {
        int sizeBefore = validTenantCache.size();
        validTenantCache.clear();
        lastFullRefresh.set(System.currentTimeMillis());
        log.debug("TenantFilter: full cache refresh completed; evicted {} cached tenant entries", sizeBefore);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Manual cache control
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Clears the entire tenant cache. Should be called after bulk tenant operations
     * (e.g., data migration) or from integration tests.
     */
    public void clearCache() {
        validTenantCache.clear();
        log.info("TenantFilter: cache manually cleared");
    }

    /**
     * Immediately removes a single tenant from the cache.
     * Should be called whenever a tenant is deactivated or deleted so that subsequent
     * requests fail validation without waiting for the next scheduled refresh.
     *
     * @param tenantId UUID of the tenant to invalidate.
     */
    public void invalidateTenant(UUID tenantId) {
        validTenantCache.remove(tenantId);
        log.info("TenantFilter: tenant {} removed from cache", tenantId);
    }
}
