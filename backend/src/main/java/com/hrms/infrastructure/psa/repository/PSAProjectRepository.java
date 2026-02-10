package com.hrms.infrastructure.psa.repository;

import com.hrms.domain.psa.PSAProject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for PSAProject entity with mandatory tenant isolation.
 *
 * <p><strong>SECURITY:</strong> All queries MUST include tenantId to prevent cross-tenant data leaks.
 * The inherited JpaRepository methods (findAll, findById, deleteById) are intentionally
 * overridden to enforce tenant isolation at the repository level.</p>
 */
@Repository
public interface PSAProjectRepository extends JpaRepository<PSAProject, UUID> {

    // ==================== TENANT-SAFE OVERRIDE METHODS ====================

    /**
     * Find PSA project by ID with mandatory tenant isolation.
     * Use this instead of the inherited findById().
     */
    @Query("SELECT p FROM PSAProject p WHERE p.id = :id AND p.tenantId = :tenantId")
    Optional<PSAProject> findByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Find all PSA projects for a tenant.
     * Use this instead of the inherited findAll().
     */
    @Query("SELECT p FROM PSAProject p WHERE p.tenantId = :tenantId ORDER BY p.startDate DESC")
    List<PSAProject> findAllByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Find all PSA projects for a tenant with pagination.
     */
    @Query("SELECT p FROM PSAProject p WHERE p.tenantId = :tenantId ORDER BY p.startDate DESC")
    Page<PSAProject> findAllByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    /**
     * Delete PSA project by ID with mandatory tenant isolation.
     * Use this instead of the inherited deleteById().
     */
    @Modifying
    @Query("DELETE FROM PSAProject p WHERE p.id = :id AND p.tenantId = :tenantId")
    void deleteByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Check if PSA project exists with mandatory tenant isolation.
     */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM PSAProject p WHERE p.id = :id AND p.tenantId = :tenantId")
    boolean existsByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    // ==================== TENANT-SCOPED QUERY METHODS ====================

    List<PSAProject> findByTenantIdAndStatus(UUID tenantId, PSAProject.ProjectStatus status);

    List<PSAProject> findByTenantIdAndProjectManagerId(UUID tenantId, UUID projectManagerId);

    @Query("SELECT p FROM PSAProject p WHERE p.tenantId = :tenantId AND p.projectCode = :projectCode")
    Optional<PSAProject> findByTenantIdAndProjectCode(@Param("tenantId") UUID tenantId, @Param("projectCode") String projectCode);

    // ==================== DEPRECATED - DO NOT USE ====================

    /**
     * @deprecated Use {@link #findByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    Optional<PSAProject> findById(UUID id);

    /**
     * @deprecated Use {@link #findAllByTenantId(UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    List<PSAProject> findAll();

    /**
     * @deprecated Use {@link #deleteByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    void deleteById(UUID id);

    /**
     * @deprecated Use {@link #findByTenantIdAndProjectCode(UUID, String)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Deprecated
    Optional<PSAProject> findByProjectCode(String projectCode);
}
