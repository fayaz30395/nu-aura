package com.hrms.infrastructure.tenant.repository;

import com.hrms.domain.tenant.Tenant;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Cache layer in front of {@link TenantRepository#findById(Object)} used by
 * {@link com.hrms.common.security.JwtAuthenticationFilter} to verify on every
 * request that the requesting tenant is still ACTIVE.
 *
 * <p><strong>Why a separate bean instead of {@code @Cacheable} on the
 * repository?</strong> Spring's caching AOP advisor does not reliably wrap
 * {@code default} methods defined inside Spring Data JPA repository
 * interfaces — the repository proxy only intercepts query-method invocations,
 * and {@code @Cacheable} placed on a default method is silently skipped in
 * many builds. Putting the cache on a small @Service makes the proxy boundary
 * explicit and behaves predictably across Spring Boot versions.</p>
 *
 * <p>Backed by the {@code tenantStatus} Redis cache (30s TTL — see
 * {@link com.hrms.common.config.CacheConfig}). The short TTL means admin
 * suspend/activate actions take effect within 30s even without explicit
 * eviction, but SystemAdminService should still call {@link #evict(UUID)}
 * for immediate consistency.</p>
 *
 * <p>The cache key intentionally does <em>not</em> include the current tenant
 * (it is the tenant). Since the key is the tenant UUID itself, there is no
 * cross-tenant leakage concern.</p>
 */
@Service
@RequiredArgsConstructor
public class TenantStatusCache {

    private final TenantRepository tenantRepository;

    /**
     * Cached lookup. Cached only when a tenant is found — a {@code null} /
     * empty result is NOT cached so a missing tenant cannot be replayed
     * after deletion.
     */
    @Cacheable(value = "tenantStatus", key = "#tenantId",
            unless = "#result == null or !#result.isPresent()")
    public Optional<Tenant> findById(UUID tenantId) {
        return tenantRepository.findById(tenantId);
    }

    /**
     * Evict a single tenant's entry. Call this from admin flows that change a
     * tenant's status (suspend / activate / archive) so the next request sees
     * the new status immediately rather than waiting for TTL expiry.
     */
    @CacheEvict(value = "tenantStatus", key = "#tenantId")
    public void evict(UUID tenantId) {
        // No-op body — annotation does the work.
    }
}
