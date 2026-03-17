package com.hrms.common.entity;

import com.hrms.common.security.TenantContext;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.PreRemove;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.UUID;

/**
 * JPA Entity Listener that enforces tenant isolation at the persistence layer.
 *
 * <h3>Purpose</h3>
 * Acts as a runtime safety net to prevent cross-tenant data leaks.
 * Automatically injects the current tenant ID on persist operations
 * and validates tenant consistency on updates and deletes.
 *
 * <h3>Architecture</h3>
 * This is defence-in-depth on top of:
 * <ol>
 *   <li>Application-layer filtering via {@code TenantContext} + JPA queries</li>
 *   <li>PostgreSQL Row-Level Security (permissive policies)</li>
 * </ol>
 *
 * <h3>SuperAdmin Bypass</h3>
 * When no tenant context is set (e.g., SuperAdmin cross-tenant operations
 * or system-level scheduled jobs), the listener logs a warning but does NOT
 * block the operation. This matches the existing architecture where
 * SuperAdmin bypasses all tenant checks.
 *
 * @see TenantAware
 * @see TenantContext
 */
public class TenantEntityListener {

    private static final Logger log = LoggerFactory.getLogger(TenantEntityListener.class);

    /**
     * Auto-inject tenant ID on new entity creation.
     * If the entity doesn't already have a tenant ID, set it from TenantContext.
     */
    @PrePersist
    public void onPrePersist(Object entity) {
        if (!(entity instanceof TenantAware tenantEntity)) {
            return;
        }

        UUID currentTenant = TenantContext.getCurrentTenant();

        if (tenantEntity.getTenantId() == null) {
            if (currentTenant != null) {
                tenantEntity.setTenantId(currentTenant);
            } else {
                log.warn("[TenantEntityListener] Persisting {} without tenant context. " +
                        "This is acceptable for SuperAdmin/system operations but should be " +
                        "investigated if unexpected.", entity.getClass().getSimpleName());
            }
        } else if (currentTenant != null && !tenantEntity.getTenantId().equals(currentTenant)) {
            // Entity has a different tenant ID than the current context — potential cross-tenant write
            log.error("[TenantEntityListener] TENANT MISMATCH on persist! Entity {} has tenantId={} " +
                    "but current context is {}. Blocking write.",
                    entity.getClass().getSimpleName(), tenantEntity.getTenantId(), currentTenant);
            throw new SecurityException(
                    "Tenant isolation violation: cannot persist entity belonging to tenant " +
                    tenantEntity.getTenantId() + " in context of tenant " + currentTenant);
        }
    }

    /**
     * Validate tenant consistency on updates.
     * Prevents accidental cross-tenant modifications.
     */
    @PreUpdate
    public void onPreUpdate(Object entity) {
        if (!(entity instanceof TenantAware tenantEntity)) {
            return;
        }

        UUID currentTenant = TenantContext.getCurrentTenant();

        if (currentTenant != null && tenantEntity.getTenantId() != null
                && !tenantEntity.getTenantId().equals(currentTenant)) {
            log.error("[TenantEntityListener] TENANT MISMATCH on update! Entity {} (id={}) " +
                    "belongs to tenant {} but current context is {}. Blocking update.",
                    entity.getClass().getSimpleName(),
                    tenantEntity.getId(),
                    tenantEntity.getTenantId(),
                    currentTenant);
            throw new SecurityException(
                    "Tenant isolation violation: cannot update entity belonging to tenant " +
                    tenantEntity.getTenantId() + " in context of tenant " + currentTenant);
        }
    }

    /**
     * Validate tenant consistency on deletes.
     * Prevents accidental cross-tenant deletions.
     */
    @PreRemove
    public void onPreRemove(Object entity) {
        if (!(entity instanceof TenantAware tenantEntity)) {
            return;
        }

        UUID currentTenant = TenantContext.getCurrentTenant();

        if (currentTenant != null && tenantEntity.getTenantId() != null
                && !tenantEntity.getTenantId().equals(currentTenant)) {
            log.error("[TenantEntityListener] TENANT MISMATCH on delete! Entity {} (id={}) " +
                    "belongs to tenant {} but current context is {}. Blocking delete.",
                    entity.getClass().getSimpleName(),
                    tenantEntity.getId(),
                    tenantEntity.getTenantId(),
                    currentTenant);
            throw new SecurityException(
                    "Tenant isolation violation: cannot delete entity belonging to tenant " +
                    tenantEntity.getTenantId() + " in context of tenant " + currentTenant);
        }
    }
}
