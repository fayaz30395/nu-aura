package com.hrms.infrastructure.dataimport.repository;

import com.hrms.domain.dataimport.KekaImportHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for KEKA import history
 */
@Repository
public interface KekaImportHistoryRepository extends JpaRepository<KekaImportHistory, UUID> {

    /**
     * Get all imports for a tenant, paginated
     */
    Page<KekaImportHistory> findByTenantIdOrderByUploadedAtDesc(UUID tenantId, Pageable pageable);

    /**
     * Get imports by status for a tenant
     */
    Page<KekaImportHistory> findByTenantIdAndStatusOrderByUploadedAtDesc(UUID tenantId, String status, Pageable pageable);
}
