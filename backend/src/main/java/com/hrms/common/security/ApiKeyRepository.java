package com.hrms.common.security;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ApiKey entity with mandatory tenant isolation.
 *
 * <p><strong>SECURITY:</strong> Most operations require tenantId for isolation.
 * The exception is API key validation during authentication, which uses
 * {@link #findActiveByKeyPrefix(String)} to locate candidate keys by prefix
 * before verifying the hash match.</p>
 */
@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    // ==================== TENANT-SAFE METHODS ====================

    /**
     * Find API key by ID with mandatory tenant isolation.
     */
    Optional<ApiKey> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Find all API keys for a tenant.
     */
    List<ApiKey> findByTenantId(UUID tenantId);

    /**
     * Find active API keys for a tenant.
     */
    List<ApiKey> findByTenantIdAndIsActiveTrue(UUID tenantId);

    /**
     * Delete API key by ID with mandatory tenant isolation.
     */
    @Modifying
    @Query("DELETE FROM ApiKey a WHERE a.id = :id AND a.tenantId = :tenantId")
    void deleteByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Check if API key exists with mandatory tenant isolation.
     */
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM ApiKey a WHERE a.id = :id AND a.tenantId = :tenantId")
    boolean existsByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    // ==================== AUTHENTICATION METHODS ====================
    // These methods are used during API key authentication before tenant context is established.
    // They are intentionally cross-tenant but narrowly scoped.

    /**
     * Find active API keys by their prefix for authentication.
     *
     * <p><strong>SECURITY:</strong> This method is used during authentication to find
     * candidate keys by prefix. Only active, non-expired keys are returned.
     * The actual key validation happens in the service layer via hash comparison.</p>
     *
     * @param keyPrefix the first 8 characters of the raw API key
     * @return list of candidate keys matching the prefix
     */
    @EntityGraph(attributePaths = {"scopes"})
    @Query("SELECT a FROM ApiKey a WHERE a.keyPrefix = :keyPrefix AND a.isActive = true AND " +
           "(a.expiresAt IS NULL OR a.expiresAt > CURRENT_TIMESTAMP)")
    List<ApiKey> findActiveByKeyPrefix(@Param("keyPrefix") String keyPrefix);

    /**
     * Find valid API key by exact hash match.
     *
     * <p><strong>SECURITY:</strong> This is used as a fallback when prefix matching
     * is not available. Returns only active, non-expired keys.</p>
     */
    @EntityGraph(attributePaths = {"scopes"})
    @Query("SELECT a FROM ApiKey a WHERE a.keyHash = :keyHash AND a.isActive = true AND " +
           "(a.expiresAt IS NULL OR a.expiresAt > CURRENT_TIMESTAMP)")
    Optional<ApiKey> findValidByKeyHash(@Param("keyHash") String keyHash);

    /**
     * Check if a key hash already exists (for uniqueness validation during key creation).
     */
    boolean existsByKeyHash(String keyHash);

    // ==================== DEPRECATED - DO NOT USE ====================

    /**
     * @deprecated Use {@link #findByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    Optional<ApiKey> findById(UUID id);

    /**
     * @deprecated This method returns ALL API keys across ALL tenants.
     * Use {@link #findByTenantId(UUID)} or {@link #findActiveByKeyPrefix(String)} instead.
     */
    @Override
    @Deprecated
    List<ApiKey> findAll();

    /**
     * @deprecated Use {@link #deleteByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    void deleteById(UUID id);

    /**
     * @deprecated Use {@link #findValidByKeyHash(String)} for authentication
     * or {@link #findByIdAndTenantId(UUID, UUID)} for tenant-scoped access.
     */
    @Deprecated
    Optional<ApiKey> findByKeyHash(String keyHash);
}
