package com.nulogic.infrastructure.compliance;

import com.nulogic.domain.compliance.DsrRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port for {@link DsrRequest}. Uses Spring Data derived queries
 * exclusively; the {@code @Where(is_deleted = false)} clause on the entity
 * automatically excludes soft-deleted rows from all derived finders.
 */
@Repository
public interface DsrRequestRepository extends JpaRepository<DsrRequest, UUID> {

    /**
     * Admin queue view — list requests for a tenant in a specific status.
     * Used by {@code GET /api/v1/me/dsr/admin?status=PENDING}.
     */
    Page<DsrRequest> findByTenantIdAndStatus(UUID tenantId, DsrRequest.Status status, Pageable pageable);

    /**
     * Admin queue view (no status filter) — all open + closed requests for a tenant.
     * Used by {@code GET /api/v1/me/dsr/admin}.
     */
    Page<DsrRequest> findByTenantId(UUID tenantId, Pageable pageable);

    /**
     * User self-service view — all non-deleted requests filed by a given user.
     * Used by {@code GET /api/v1/me/dsr/status}.
     */
    List<DsrRequest> findByRequesterUserIdAndIsDeletedFalse(UUID userId);

    /**
     * Tenant-safe single-row lookup — the controller must always scope reads by
     * tenant to prevent cross-tenant ID-guessing attacks against this queue.
     */
    Optional<DsrRequest> findByIdAndTenantId(UUID id, UUID tenantId);
}
