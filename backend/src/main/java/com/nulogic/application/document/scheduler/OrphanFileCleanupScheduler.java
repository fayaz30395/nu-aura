package com.nulogic.application.document.scheduler;

import com.nulogic.application.document.service.StorageProvider;
import com.nulogic.application.document.service.StorageProvider.StoredObjectInfo;
import com.nulogic.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Scheduled job for detecting orphaned files in storage.
 *
 * <p>Runs weekly at 2:00 AM UTC on Sunday. Lists all objects via the active
 * {@link StorageProvider}, cross-references them against the generated_documents
 * and document_versions tables, and logs any orphaned files (files in storage
 * not tracked by any DB record).</p>
 *
 * <p><strong>Phase 1 (current):</strong> Report-only — orphaned files are logged
 * but not deleted. Review logs before enabling deletion in Phase 2.</p>
 *
 * <p>Only files older than 48 hours are considered orphans to avoid flagging
 * in-flight uploads that haven't been committed to the database yet.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrphanFileCleanupScheduler {

    /**
     * Minimum age in hours before a file is considered potentially orphaned.
     */
    private static final int ORPHAN_AGE_THRESHOLD_HOURS = 48;
    private final StorageProvider storageProvider;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Weekly orphan file detection job.
     * Cron: 2:00 AM UTC every Sunday.
     */
    @Scheduled(cron = "0 0 2 * * SUN", zone = "UTC")
    @SchedulerLock(name = "orphanFileCleanup", lockAtLeastFor = "PT10M", lockAtMostFor = "PT60M")
    public void detectOrphanFiles() {
        log.info("OrphanFileCleanupScheduler: starting weekly orphan file detection");

        try {
            // generated_documents/document_versions/file_metadata all have RLS enabled
            // (V81) keyed on app.current_tenant_id. This scheduler runs with no request
            // context, so TenantContext.getCurrentTenant() is null unless explicitly set
            // — querying those tables without setting it returns ZERO rows (RLS fails
            // closed), which would previously have flagged every real file in every
            // tenant as orphaned. Fixed by iterating tenants explicitly and setting
            // TenantContext per tenant, rather than relying on ambient request context.
            List<UUID> tenantIds = jdbcTemplate.queryForList("SELECT id FROM tenants", UUID.class);

            List<StoredObjectInfo> storedObjects = storageProvider.listObjects(null);
            ZonedDateTime cutoff = ZonedDateTime.now().minusHours(ORPHAN_AGE_THRESHOLD_HOURS);
            List<String> orphanedFiles = new ArrayList<>();
            long totalObjects = 0;
            long totalKnownPaths = 0;

            for (UUID tenantId : tenantIds) {
                Set<String> knownPaths;
                try {
                    TenantContext.setCurrentTenant(tenantId);
                    knownPaths = collectKnownFilePaths();
                } finally {
                    TenantContext.clear();
                }
                totalKnownPaths += knownPaths.size();

                String tenantPrefix = tenantId + "/";
                for (StoredObjectInfo item : storedObjects) {
                    if (!item.objectName().startsWith(tenantPrefix)) {
                        continue;
                    }
                    totalObjects++;

                    if (item.isDirectory()) {
                        continue;
                    }

                    ZonedDateTime lastModified = item.lastModified();
                    if (lastModified != null && lastModified.isAfter(cutoff)) {
                        continue;
                    }

                    String objectName = item.objectName();
                    if (!knownPaths.contains(objectName)) {
                        orphanedFiles.add(objectName);
                    }
                }
            }
            log.info("OrphanFileCleanupScheduler: found {} tracked file paths across {} tenant(s)",
                    totalKnownPaths, tenantIds.size());

            // Report only (Phase 1: no deletion)
            if (orphanedFiles.isEmpty()) {
                log.info("OrphanFileCleanupScheduler: no orphaned files detected " +
                        "(scanned {} objects)", totalObjects);
            } else {
                log.warn("OrphanFileCleanupScheduler: detected {} orphaned file(s) " +
                        "out of {} total objects", orphanedFiles.size(), totalObjects);
                for (String orphan : orphanedFiles) {
                    log.warn("OrphanFileCleanupScheduler: orphaned file: {}", orphan);
                }
            }

        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            log.error("OrphanFileCleanupScheduler: failed during orphan detection", e);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Collect all file paths tracked in the database, for the tenant currently set
     * on {@link TenantContext} (across all three document tables).
     */
    private Set<String> collectKnownFilePaths() {
        Set<String> paths = new HashSet<>();

        // Paths from generated_documents table
        List<String> generatedPaths = jdbcTemplate.queryForList(
                "SELECT file_path FROM generated_documents WHERE file_path IS NOT NULL",
                String.class);
        paths.addAll(generatedPaths);

        // Paths from document_versions table
        List<String> versionPaths = jdbcTemplate.queryForList(
                "SELECT file_path FROM document_versions WHERE file_path IS NOT NULL",
                String.class);
        paths.addAll(versionPaths);

        // Paths from file_metadata table (employee document uploads) — without this,
        // every real uploaded file is flagged as a false-positive orphan.
        List<String> metadataPaths = jdbcTemplate.queryForList(
                "SELECT storage_path FROM file_metadata WHERE storage_path IS NOT NULL",
                String.class);
        paths.addAll(metadataPaths);

        return paths;
    }
}
