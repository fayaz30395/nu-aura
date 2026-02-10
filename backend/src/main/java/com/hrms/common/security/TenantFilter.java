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
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class TenantFilter extends OncePerRequestFilter {

    private final TenantRepository tenantRepository;

    @Value("${app.tenant.header-name}")
    private String tenantHeader;

    @Value("${app.tenant.validation.enabled:true}")
    private boolean tenantValidationEnabled;

    // Cache valid tenant IDs to avoid DB lookups on every request
    private final Set<UUID> validTenantCache = ConcurrentHashMap.newKeySet();

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
                    log.warn("Invalid tenant ID format: {}", tenantId);
                    response.setStatus(HttpStatus.BAD_REQUEST.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Invalid tenant ID format\"}");
                    return;
                }

                // Validate tenant exists (with caching) unless disabled (e.g., tests)
                if (tenantValidationEnabled && !isValidTenant(tenant)) {
                    log.warn("Tenant not found: {}", tenantId);
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Invalid or inactive tenant\"}");
                    return;
                }

                TenantContext.setCurrentTenant(tenant);
                // Also set in common module TenantContext for PM module
                com.nulogic.common.security.TenantContext.setCurrentTenant(tenant);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            com.nulogic.common.security.TenantContext.clear();
        }
    }

    private boolean isValidTenant(UUID tenantId) {
        // Check cache first
        if (validTenantCache.contains(tenantId)) {
            return true;
        }

        // Check database
        boolean exists = tenantRepository.existsById(tenantId);
        if (exists) {
            validTenantCache.add(tenantId);
        }
        return exists;
    }

    /**
     * Clear the tenant cache (call when tenants are modified)
     */
    public void clearCache() {
        validTenantCache.clear();
    }

    /**
     * Remove a specific tenant from cache (call when tenant is deactivated/deleted)
     */
    public void invalidateTenant(UUID tenantId) {
        validTenantCache.remove(tenantId);
    }
}
