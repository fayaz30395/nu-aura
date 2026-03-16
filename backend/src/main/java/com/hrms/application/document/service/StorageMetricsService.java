package com.hrms.application.document.service;

import com.hrms.domain.document.DocumentVersionRepository;
import com.hrms.domain.document.GeneratedDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for calculating storage metrics across the system.
 *
 * <p>Provides two sources of storage metrics:
 * <ol>
 *   <li><strong>Database-tracked storage:</strong> Sum of fileSize columns in
 *       generated_documents and document_versions tables. This is the current active
 *       source.</li>
 *   <li><strong>MinIO integration (TODO):</strong> Once MinIO Admin API is integrated,
 *       this service will support querying actual bucket usage statistics for more
 *       accurate billing. See NUJIRA-XXX for tracking.</li>
 * </ol>
 *
 * <p>For now, callers should use {@link #getStorageBytesForTenant(UUID)} and
 * {@link #getStorageBytesAcrossAllTenants()} which rely on the database-tracked
 * fileSize columns. These are populated during file uploads via
 * {@link FileStorageService#uploadFile(java.io.InputStream, String, String, long, String, UUID)}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageMetricsService {

    private final GeneratedDocumentRepository generatedDocumentRepository;
    private final DocumentVersionRepository documentVersionRepository;

    /**
     * Get total storage usage in bytes for a specific tenant.
     *
     * <p>Sums fileSize from both generated_documents and document_versions tables.
     *
     * @param tenantId the tenant ID
     * @return total storage in bytes
     */
    @Transactional(readOnly = true)
    public long getStorageBytesForTenant(UUID tenantId) {
        long generatedDocBytes = generatedDocumentRepository.sumFileSizeByTenantId(tenantId);
        long versionedDocBytes = documentVersionRepository.sumFileSizeByTenantId(tenantId);

        long totalBytes = generatedDocBytes + versionedDocBytes;

        log.debug("Storage metrics for tenant {}: generated docs={} bytes, " +
                "versioned docs={} bytes, total={} bytes",
                tenantId, generatedDocBytes, versionedDocBytes, totalBytes);

        return totalBytes;
    }

    /**
     * Get total storage usage in bytes across all tenants.
     * SuperAdmin use only.
     *
     * <p>Sums fileSize from both generated_documents and document_versions tables
     * across all tenants.
     *
     * @return total storage in bytes across the system
     */
    @Transactional(readOnly = true)
    public long getStorageBytesAcrossAllTenants() {
        long generatedDocBytes = generatedDocumentRepository.sumFileSizeAcrossAllTenants();
        long versionedDocBytes = documentVersionRepository.sumFileSizeAcrossAllTenants();

        long totalBytes = generatedDocBytes + versionedDocBytes;

        log.debug("System-wide storage metrics: generated docs={} bytes, " +
                "versioned docs={} bytes, total={} bytes",
                generatedDocBytes, versionedDocBytes, totalBytes);

        return totalBytes;
    }
}
