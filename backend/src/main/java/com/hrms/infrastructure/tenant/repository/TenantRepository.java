package com.hrms.infrastructure.tenant.repository;

import com.hrms.domain.tenant.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    Optional<Tenant> findByCode(String code);

    boolean existsByCode(String code);

    // R2-003 FIX: Used by scheduled jobs to iterate over all active tenants
    // so that per-tenant queries are run with the correct tenant context.
    List<Tenant> findByStatus(Tenant.TenantStatus status);

    /**
     * Count tenants by status — used by SuperAdmin overview to report accurate active tenant count.
     * Spring Data JPA derives the query automatically.
     */
    long countByStatus(Tenant.TenantStatus status);

    /**
     * Count tenants created on or before a given datetime.
     * Used by getGrowthMetrics() to replace in-memory stream filtering.
     */
    @Query("SELECT COUNT(t) FROM Tenant t WHERE t.createdAt <= :cutoff")
    long countByCreatedAtBefore(@Param("cutoff") LocalDateTime cutoff);
}
