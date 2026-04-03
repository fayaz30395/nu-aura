package com.hrms.common.security;

import java.util.UUID;

/**
 * Thread-local context for tenant isolation in multi-tenant operations.
 *
 * <p><strong>SECURITY:</strong> Use {@link #requireCurrentTenant()} in all
 * service and controller methods to enforce tenant presence and prevent
 * accidental cross-tenant data access.</p>
 */
public class TenantContext {
    private static final ThreadLocal<UUID> currentTenant = new ThreadLocal<>();

    public static UUID getCurrentTenant() {
        return currentTenant.get();
    }

    public static void setCurrentTenant(UUID tenantId) {
        currentTenant.set(tenantId);
    }

    /**
     * Get the current tenant ID, throwing an exception if not set.
     *
     * <p><strong>SECURITY:</strong> Use this method instead of {@link #getCurrentTenant()}
     * in service and controller code to ensure tenant context is always present.
     * This prevents accidental null tenant IDs from causing cross-tenant data leaks.</p>
     *
     * @return the current tenant ID, never null
     * @throws IllegalStateException if tenant context is not set
     */
    public static UUID requireCurrentTenant() {
        UUID tenantId = currentTenant.get();
        if (tenantId == null) {
            throw new IllegalStateException(
                    "Tenant context not set. This operation requires a valid tenant context. " +
                            "Ensure the request passes through TenantFilter or tenant is explicitly set."
            );
        }
        return tenantId;
    }

    public static void clear() {
        currentTenant.remove();
    }
}
