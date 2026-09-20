package com.nulogic.infrastructure.psa.repository;

import com.nulogic.domain.psa.PSAProjectAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for PSAProjectAllocation entity with mandatory tenant isolation.
 *
 * <p><strong>SECURITY:</strong> All queries MUST include tenantId to prevent cross-tenant data leaks.</p>
 */
@Repository
public interface PSAProjectAllocationRepository extends JpaRepository<PSAProjectAllocation, UUID> {

    @Query("SELECT a FROM PSAProjectAllocation a WHERE a.projectId = :projectId AND a.tenantId = :tenantId")
    List<PSAProjectAllocation> findByProjectIdAndTenantId(@Param("projectId") UUID projectId, @Param("tenantId") UUID tenantId);
}
