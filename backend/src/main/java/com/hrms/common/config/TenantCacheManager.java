package com.hrms.common.config;

import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/**
 * Tenant-scoped cache management service.
 *
 * <p>Provides utilities for invalidating caches at the tenant level,
 * ensuring proper isolation in multi-tenant environments.</p>
 *
 * <p><strong>SECURITY:</strong> All operations are scoped to the current tenant
 * to prevent cross-tenant cache manipulation.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TenantCacheManager {

    private final RedisTemplate<String, Object> redisTemplate;

    // Cache name patterns
    private static final String TENANT_KEY_PREFIX = "tenant:";

    /**
     * Invalidate all caches for the current tenant.
     */
    public void invalidateCurrentTenantCaches() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            log.warn("Cannot invalidate caches: no tenant context set");
            return;
        }
        invalidateTenantCaches(tenantId);
    }

    /**
     * Invalidate all caches for a specific tenant.
     *
     * @param tenantId The tenant ID to invalidate caches for
     */
    public void invalidateTenantCaches(UUID tenantId) {
        if (tenantId == null) {
            log.warn("Cannot invalidate caches: tenantId is null");
            return;
        }

        String pattern = TENANT_KEY_PREFIX + tenantId.toString() + ":*";
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                Long deleted = redisTemplate.delete(keys);
                log.info("Invalidated {} cache entries for tenant: {}", deleted, tenantId);
            } else {
                log.debug("No cache entries found for tenant: {}", tenantId);
            }
        } catch (Exception e) {
            log.error("Error invalidating caches for tenant: {}", tenantId, e);
        }
    }

    /**
     * Invalidate a specific cache type for the current tenant.
     *
     * @param cacheName The name of the cache to invalidate (e.g., "leaveTypes", "departments")
     */
    public void invalidateCache(String cacheName) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            log.warn("Cannot invalidate cache {}: no tenant context set", cacheName);
            return;
        }
        invalidateCache(tenantId, cacheName);
    }

    /**
     * Invalidate a specific cache type for a specific tenant.
     *
     * @param tenantId The tenant ID
     * @param cacheName The name of the cache to invalidate
     */
    public void invalidateCache(UUID tenantId, String cacheName) {
        if (tenantId == null || cacheName == null) {
            log.warn("Cannot invalidate cache: tenantId or cacheName is null");
            return;
        }

        // Pattern matches cache keys like: tenant:{tenantId}:{cacheName}:*
        String pattern = TENANT_KEY_PREFIX + tenantId.toString() + ":" + cacheName + ":*";
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                Long deleted = redisTemplate.delete(keys);
                log.info("Invalidated {} entries from cache '{}' for tenant: {}", deleted, cacheName, tenantId);
            } else {
                log.debug("No cache entries found for '{}' in tenant: {}", cacheName, tenantId);
            }
        } catch (Exception e) {
            log.error("Error invalidating cache '{}' for tenant: {}", cacheName, tenantId, e);
        }
    }

    /**
     * Invalidate a specific cache entry by key.
     *
     * @param fullKey The full cache key to invalidate
     */
    public void invalidateKey(String fullKey) {
        try {
            Boolean deleted = redisTemplate.delete(fullKey);
            if (Boolean.TRUE.equals(deleted)) {
                log.debug("Invalidated cache key: {}", fullKey);
            }
        } catch (Exception e) {
            log.error("Error invalidating cache key: {}", fullKey, e);
        }
    }

    /**
     * Invalidate multiple cache types for the current tenant.
     *
     * @param cacheNames The names of caches to invalidate
     */
    public void invalidateCaches(String... cacheNames) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            log.warn("Cannot invalidate caches: no tenant context set");
            return;
        }

        for (String cacheName : cacheNames) {
            invalidateCache(tenantId, cacheName);
        }
    }

    /**
     * Get count of cache entries for a tenant.
     *
     * @param tenantId The tenant ID
     * @return Number of cache entries
     */
    public long getCacheCount(UUID tenantId) {
        if (tenantId == null) {
            return 0;
        }

        String pattern = TENANT_KEY_PREFIX + tenantId.toString() + ":*";
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            return keys != null ? keys.size() : 0;
        } catch (Exception e) {
            log.error("Error counting cache entries for tenant: {}", tenantId, e);
            return 0;
        }
    }

    /**
     * Invalidate all caches across all tenants (admin operation).
     * Use with caution - this affects all tenants.
     */
    public void invalidateAllCaches() {
        String pattern = TENANT_KEY_PREFIX + "*";
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                Long deleted = redisTemplate.delete(keys);
                log.warn("Invalidated {} cache entries across ALL tenants", deleted);
            }
        } catch (Exception e) {
            log.error("Error invalidating all caches", e);
        }
    }

    /**
     * Warm up cache for a tenant by pre-loading common data.
     * Implementations should call relevant services to populate caches.
     *
     * @param tenantId The tenant ID to warm cache for
     */
    public void warmCache(UUID tenantId) {
        log.info("Cache warm-up requested for tenant: {}. Implement specific warm-up logic as needed.", tenantId);
        // This is a hook for implementing cache warming strategies
        // Services can override or extend this to pre-load their specific caches
    }
}
