package com.hrms.infrastructure.common.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Base repository interface for tenant-scoped entities that extend {@link com.nulogic.common.entity.BaseEntity}.
 *
 * <p>Provides the most commonly duplicated query methods across the codebase's 254+ repositories,
 * scoped by {@code tenantId} with optional soft-delete ({@code isDeleted}) filtering.</p>
 *
 * <h3>Usage</h3>
 * <p>New repositories should extend this interface instead of {@link JpaRepository} directly:</p>
 * <pre>{@code
 * @Repository
 * public interface MyEntityRepository extends TenantAwareRepository<MyEntity> {
 *     // Only add entity-specific query methods here.
 *     // Common tenant-scoped methods are inherited.
 * }
 * }</pre>
 *
 * <p>If the repository also needs {@link org.springframework.data.jpa.repository.JpaSpecificationExecutor},
 * declare it alongside:</p>
 * <pre>{@code
 * @Repository
 * public interface MyEntityRepository
 *         extends TenantAwareRepository<MyEntity>, JpaSpecificationExecutor<MyEntity> {
 * }
 * }</pre>
 *
 * <h3>Migration Strategy</h3>
 * <p>Existing repositories can be migrated incrementally — change the extends clause and remove
 * any methods whose signatures now match inherited ones. No behavior change is required.</p>
 *
 * <h3>Soft-Delete Convention</h3>
 * <p>Methods suffixed with {@code IsDeletedFalse} exclude soft-deleted records, matching the
 * {@code is_deleted} column on {@link com.nulogic.common.entity.BaseEntity}. Use the non-suffixed
 * variants (e.g. {@link #findAllByTenantId(UUID, Pageable)}) for admin/audit views that need
 * to include deleted records.</p>
 *
 * @param <T> the entity type, which must have {@code tenantId} and {@code isDeleted} fields
 *            (inherited from {@link com.nulogic.common.entity.BaseEntity})
 * @see com.nulogic.common.entity.BaseEntity
 * @see com.nulogic.common.entity.TenantAware
 */
@NoRepositoryBean
public interface TenantAwareRepository<T> extends JpaRepository<T, UUID> {

    // ==================== SOFT-DELETE AWARE (default for application queries) ====================

    /**
     * Find all non-deleted entities for a tenant, with pagination.
     */
    Page<T> findAllByTenantIdAndIsDeletedFalse(UUID tenantId, Pageable pageable);

    /**
     * Find all non-deleted entities for a tenant (unpaginated).
     * <p><strong>WARNING:</strong> Use with caution on large datasets. Prefer the paginated variant.</p>
     */
    List<T> findAllByTenantIdAndIsDeletedFalse(UUID tenantId);

    /**
     * Find a single non-deleted entity by ID within a tenant.
     */
    Optional<T> findByIdAndTenantIdAndIsDeletedFalse(UUID id, UUID tenantId);

    /**
     * Count non-deleted entities for a tenant.
     */
    long countByTenantIdAndIsDeletedFalse(UUID tenantId);

    /**
     * Check if a non-deleted entity exists by ID within a tenant.
     */
    boolean existsByIdAndTenantIdAndIsDeletedFalse(UUID id, UUID tenantId);

    // ==================== WITHOUT SOFT-DELETE FILTER (admin / audit / migration) ====================

    /**
     * Find all entities for a tenant (including soft-deleted), with pagination.
     */
    Page<T> findAllByTenantId(UUID tenantId, Pageable pageable);

    /**
     * Find all entities for a tenant (including soft-deleted), unpaginated.
     * <p><strong>WARNING:</strong> Use with caution on large datasets. Prefer the paginated variant.</p>
     */
    List<T> findAllByTenantId(UUID tenantId);

    /**
     * Find a single entity by ID within a tenant (including soft-deleted).
     */
    Optional<T> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Count all entities for a tenant (including soft-deleted).
     */
    long countByTenantId(UUID tenantId);

    /**
     * Check if an entity exists by ID within a tenant (including soft-deleted).
     */
    boolean existsByIdAndTenantId(UUID id, UUID tenantId);
}
