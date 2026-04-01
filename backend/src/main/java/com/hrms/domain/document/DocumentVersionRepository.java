package com.hrms.domain.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for DocumentVersion entities.
 * Provides storage metrics queries for versioned documents.
 */
@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {

    /**
     * Calculate total storage used by all document versions for a specific tenant.
     * Returns the sum of file sizes in bytes.
     *
     * @param tenantId the tenant ID
     * @return total size in bytes, or 0 if no versions exist
     */
    @Query("SELECT COALESCE(SUM(dv.fileSize), 0) FROM DocumentVersion dv WHERE dv.tenantId = :tenantId")
    long sumFileSizeByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Calculate total storage used by all document versions across the entire system.
     * SuperAdmin use only.
     *
     * @return total size in bytes across all tenants
     */
    @Query("SELECT COALESCE(SUM(dv.fileSize), 0) FROM DocumentVersion dv")
    long sumFileSizeAcrossAllTenants();
}
