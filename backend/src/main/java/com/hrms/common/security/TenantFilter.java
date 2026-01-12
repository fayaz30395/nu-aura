package com.hrms.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class TenantFilter extends OncePerRequestFilter {

    @Value("${app.tenant.header-name}")
    private String tenantHeader;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String tenantId = request.getHeader(tenantHeader);
            if (tenantId != null && !tenantId.isEmpty()) {
                UUID tenant = UUID.fromString(tenantId);
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
}
