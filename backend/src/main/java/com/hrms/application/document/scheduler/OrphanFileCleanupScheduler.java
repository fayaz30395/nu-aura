package com.hrms.application.document.scheduler;

import com.hrms.application.document.service.StorageProvider;
import com.hrms.application.document.service.StorageProvider.StoredObjectInfo;
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

    private final StorageProvider storageProvider;
    private final JdbcTemplate jdbcTemplate;

    /** Minimum age in hours before a file is considered potentially orphaned. */
    private static final int ORPHAN_AGE_THRESHOLD_HOURS = 48;

    /**
     * Weekly orphan file detection job.
     * Cron: 2:00 AM UTC every Sunday.
     */
    @Scheduled(cron = "0 0 2 * * SUN", zone = "UTC")
    @SchedulerLock(name = "orphanFileCleanup", lockAtLeastFor = "PT10M", lockAtMostFor = "PT60M")
    public void detectOrphanFiles() {
        log.info("OrphanFileCleanupScheduler: starting weekly orphan file detection");

        try {
            // 1. Collect all known file paths from the database
            Set<String> knownPaths = collectKnownFilePaths();
            log.info("OrphanFileCleanupScheduler: found {} tracked file paths in database", knownPaths.size());

            // 2. List all objects in storage older than threshold
            ZonedDateTime cutoff = ZonedDateTime.now().minusHours(ORPHAN_AGE_THRESHOLD_HOURS);
            List<String> orphanedFiles = new ArrayList<>();
            long totalObjects = 0;

            List<StoredObjectInfo> storedObjects = storageProvider.listObjects(null);

            for (StoredObjectInfo item : storedObjects) {
                totalObjects++;

                // Skip directories
                if (item.isDirectory()) {
                    continue;
                }

                // Only consider objects older than the threshold
                ZonedDateTime lastModified = item.lastModified();
                if (lastModified != null && lastModified.isAfter(cutoff)) {
                    continue;
                }

                String objectName = item.objectName();
                if (!knownPaths.contains(objectName)) {
                    orphanedFiles.add(objectName);
                }
            }

            // 3. Log results (Phase 1: report only, no deletion)
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
        }
    }

    /**
     * Collect all file paths tracked in the database across both document tables.
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

        return paths;
    }
}
