package com.hrms.common.config;

import com.hrms.common.security.TenantContext;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Resolves the current tenant identifier for Hibernate multi-tenancy.
 * Uses TenantContext to get the current tenant ID set by the tenant filter.
 */
@Component
public class TenantIdentifierResolver implements CurrentTenantIdentifierResolver<UUID> {

    // Default tenant ID used when no tenant context is available (e.g., during startup)
    // This is a well-known UUID that represents "no tenant" - it won't match any real tenant
    private static final UUID DEFAULT_TENANT = UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Override
    public UUID resolveCurrentTenantIdentifier() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null) {
            return tenantId;
        }
        return DEFAULT_TENANT;
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
