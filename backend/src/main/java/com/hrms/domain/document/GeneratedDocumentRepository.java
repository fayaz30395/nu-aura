package com.hrms.domain.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for GeneratedDocument entities.
 * Provides storage metrics queries for billing and monitoring.
 */
@Repository
public interface GeneratedDocumentRepository extends JpaRepository<GeneratedDocument, UUID> {

    /**
     * Calculate total storage used by all generated documents for a specific tenant.
     * Returns the sum of file sizes in bytes.
     *
     * @param tenantId the tenant ID
     * @return total size in bytes, or 0 if no documents exist
     */
    @Query("SELECT COALESCE(SUM(gd.fileSize), 0) FROM GeneratedDocument gd WHERE gd.tenantId = :tenantId")
    long sumFileSizeByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Calculate total storage used by all generated documents across the entire system.
     * SuperAdmin use only.
     *
     * @return total size in bytes across all tenants
     */
    @Query("SELECT COALESCE(SUM(gd.fileSize), 0) FROM GeneratedDocument gd")
    long sumFileSizeAcrossAllTenants();
}
