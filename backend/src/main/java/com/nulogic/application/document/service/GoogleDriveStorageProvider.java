package com.nulogic.application.document.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.io.InputStream;
import java.time.ZonedDateTime;
import java.util.*;

/**
 * Google Drive-based storage provider.
 * Used for production environments.
 * <p>
 * Tenant-isolation contract (audit finding 2.1):
 * <ul>
 *   <li>{@link #upload} accepts the logical path
 *       ({@code tenantId/category/entityId/...}) as {@code objectName} and
 *       returns the opaque Drive fileId. Callers (FileStorageService) MUST
 *       persist a {@code drive_file_mapping(tenant_id, object_name, drive_file_id)}
 *       row so the logical path can be resolved back to the fileId on
 *       subsequent operations.</li>
 *   <li>{@link #download}, {@link #delete}, {@link #exists},
 *       {@link #getDownloadUrl} accept the logical path as {@code objectName}
 *       and resolve the Drive fileId server-side via
 *       {@link #resolveDriveFileId(String, UUID)}. The opaque fileId is never
 *       returned to clients, so the {@code startsWith(tenantId + "/")} guard
 *       in FileUploadController is meaningful again.</li>
 * </ul>
 */
@Slf4j
public class GoogleDriveStorageProvider implements StorageProvider {

    private final Drive driveService;
    private final String rootFolderId;
    private final JdbcTemplate jdbcTemplate;

    public GoogleDriveStorageProvider(Drive driveService, String rootFolderId, JdbcTemplate jdbcTemplate) {
        this.driveService = driveService;
        this.rootFolderId = rootFolderId;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String upload(String objectName, InputStream inputStream, long size, String contentType, Map<String, String> metadata) {
        try {
            // Parse folder hierarchy from objectName: {tenantId}/{category}/{entityId}/{filename}
            String parentFolderId = ensureFolderHierarchy(objectName);

            // Extract the filename from the objectName path
            String fileName = objectName.substring(objectName.lastIndexOf('/') + 1);

            File fileMetadata = new File();
            fileMetadata.setName(fileName);
            fileMetadata.setParents(Collections.singletonList(parentFolderId));
            fileMetadata.setMimeType(contentType);

            // Store the logical objectName and all metadata as custom properties for searchability
            Map<String, String> properties = new HashMap<>(metadata);
            properties.put("objectName", objectName);
            fileMetadata.setProperties(properties);

            InputStreamContent mediaContent = new InputStreamContent(contentType, inputStream);
            if (size > 0) {
                mediaContent.setLength(size);
            }

            File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id, name, webContentLink, size")
                    .execute();

            log.info("Google Drive upload complete: objectName={}, fileId={}", objectName, uploadedFile.getId());
            // SEC-FIX (2.1): return the Drive fileId so FileStorageService can persist
            //   drive_file_mapping(tenant_id, object_name=logicalPath, drive_file_id=this).
            // FileStorageService is responsible for mapping persistence; this method
            // does not write to drive_file_mapping itself to keep upload transactional
            // boundary aligned with the caller's @Transactional scope.
            return uploadedFile.getId();
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive upload failed for object: {}", objectName, e);
            throw new BusinessException("Failed to upload file to Google Drive: " + e.getMessage());
        }
    }

    @Override
    public String getDownloadUrl(String objectName, int expiryHours) {
        // SEC-FIX (2.2): Direct Drive webContentLink URLs are not generated anymore.
        // The previous implementation granted Permission(type=anyone, role=reader)
        // permanently — making files publicly downloadable to anyone with the URL
        // forever (no expiry). Callers MUST use the backend-proxied path
        // /api/v1/files/download/direct which streams the file through the
        // FileUploadController after enforcing the tenant guard.
        log.warn("getDownloadUrl invoked for objectName={} — direct Drive URLs disabled; " +
                "use backend-proxied /api/v1/files/download/direct instead.", objectName);
        throw new UnsupportedOperationException(
                "Direct Drive URLs disabled — use /api/v1/files/download/direct backend-proxied path");
    }

    @Override
    public InputStream download(String objectName) {
        // SEC-FIX (2.1): objectName is the logical path; resolve to Drive fileId
        // scoped to the current tenant before talking to Drive.
        String driveFileId = resolveDriveFileId(objectName, TenantContext.getCurrentTenant());
        try {
            return driveService.files().get(driveFileId)
                    .executeMediaAsInputStream();
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive download failed for objectName={} (resolved fileId={})", objectName, driveFileId, e);
            throw new BusinessException("Failed to retrieve file from Google Drive");
        }
    }

    @Override
    public void delete(String objectName) {
        // SEC-FIX (2.1): objectName is the logical path; resolve to Drive fileId
        // scoped to the current tenant before talking to Drive. Also delete the
        // mapping row so the logical path can't be reused to reach orphan data.
        UUID tenantId = TenantContext.getCurrentTenant();
        String driveFileId = resolveDriveFileId(objectName, tenantId);
        try {
            driveService.files().delete(driveFileId).execute();
            log.info("Google Drive file deleted: objectName={}, fileId={}", objectName, driveFileId);
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive delete failed for objectName={} (fileId={})", objectName, driveFileId, e);
            throw new BusinessException("Failed to delete file from Google Drive");
        }
        // Mapping cleanup is best-effort: a Drive delete failure already throws above,
        // so reaching here means the file is gone. We then remove the row.
        try {
            int rows = jdbcTemplate.update(
                    "DELETE FROM drive_file_mapping WHERE object_name = ? AND tenant_id = ?",
                    objectName, tenantId);
            log.debug("drive_file_mapping rows deleted for objectName={}: {}", objectName, rows);
        } catch (Exception e) { // Best-effort — file is already deleted in Drive
            log.warn("Failed to delete drive_file_mapping row for objectName={}: {}", objectName, e.getMessage());
        }
    }

    @Override
    public boolean exists(String objectName) {
        // SEC-FIX (2.1): objectName is the logical path. Use the mapping table to
        // check existence without leaking other tenants' fileIds.
        UUID tenantId = TenantContext.getCurrentTenant();
        String driveFileId;
        try {
            driveFileId = resolveDriveFileId(objectName, tenantId);
        } catch (AccessDeniedException | BusinessException e) {
            return false;
        }
        try {
            driveService.files().get(driveFileId)
                    .setFields("id")
                    .execute();
            return true;
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            return false;
        }
    }

    @Override
    public String copy(String sourceObjectName, String destinationObjectName) {
        // The copy() contract still takes Drive-level identifiers because it is only
        // invoked internally from FileStorageService.copyFile, which currently has
        // not been migrated to logical-path resolution. For now, callers using
        // copyFile() must pass through FileStorageService, which will persist a
        // new drive_file_mapping row keyed by destinationObjectName.
        try {
            File copiedFileMetadata = new File();
            // Extract filename from destination path if it looks like a path, otherwise use as-is
            String destFileName = destinationObjectName.contains("/")
                    ? destinationObjectName.substring(destinationObjectName.lastIndexOf('/') + 1)
                    : destinationObjectName;
            copiedFileMetadata.setName(destFileName);

            Map<String, String> properties = new HashMap<>();
            properties.put("objectName", destinationObjectName);
            copiedFileMetadata.setProperties(properties);

            // If source looks like a logical path, resolve to fileId first.
            String sourceFileId = sourceObjectName.contains("/")
                    ? resolveDriveFileId(sourceObjectName, TenantContext.getCurrentTenant())
                    : sourceObjectName;

            File copiedFile = driveService.files().copy(sourceFileId, copiedFileMetadata)
                    .setFields("id, name")
                    .execute();

            log.info("Google Drive file copied: sourceObjectName={}, newFileId={}", sourceObjectName, copiedFile.getId());
            return copiedFile.getId();
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive copy failed from {} to {}", sourceObjectName, destinationObjectName, e);
            throw new BusinessException("Failed to copy file in Google Drive");
        }
    }

    @Override
    public void ensureStorageReady() {
        try {
            // Verify the root folder is accessible
            File rootFolder = driveService.files().get(rootFolderId)
                    .setFields("id, name")
                    .execute();
            log.info("Google Drive storage ready. Root folder: {} ({})", rootFolder.getName(), rootFolder.getId());
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive root folder not accessible: {}", rootFolderId, e);
            throw new BusinessException("Failed to initialize Google Drive storage: root folder not accessible");
        }
    }

    @Override
    public List<StoredObjectInfo> listObjects(String prefix) {
        try {
            List<StoredObjectInfo> results = new ArrayList<>();
            String pageToken = null;

            do {
                // Query all non-trashed files under root folder; filter by objectName property prefix if provided
                StringBuilder query = new StringBuilder("trashed = false");
                if (prefix != null && !prefix.isBlank()) {
                    query.append(" and properties has { key='objectName' and value='")
                            .append(escapeDriveQuery(prefix)).append("' }");
                }

                var request = driveService.files().list()
                        .setQ(query.toString())
                        .setFields("nextPageToken, files(id, name, mimeType, modifiedTime, properties)")
                        .setPageSize(1000)
                        .setPageToken(pageToken)
                        .setCorpora("user");

                var fileList = request.execute();
                if (fileList.getFiles() != null) {
                    for (File file : fileList.getFiles()) {
                        boolean isDir = "application/vnd.google-apps.folder".equals(file.getMimeType());
                        String objectName = file.getId();
                        // Prefer the logical objectName stored in properties
                        if (file.getProperties() != null && file.getProperties().containsKey("objectName")) {
                            objectName = file.getProperties().get("objectName");
                        }

                        ZonedDateTime lastModified = null;
                        if (file.getModifiedTime() != null) {
                            lastModified = ZonedDateTime.parse(file.getModifiedTime().toStringRfc3339());
                        }

                        results.add(new StoredObjectInfo(objectName, lastModified, isDir));
                    }
                }
                pageToken = fileList.getNextPageToken();
            } while (pageToken != null);

            log.info("Google Drive listObjects: found {} items (prefix={})", results.size(), prefix);
            return results;
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive listObjects failed (prefix={})", prefix, e);
            throw new BusinessException("Failed to list files in Google Drive");
        }
    }

    /**
     * Resolves a logical object path to its opaque Drive fileId, enforcing tenant
     * isolation. Throws {@link AccessDeniedException} if the row does not exist
     * for the given tenant — this is the load-bearing security check for fixes
     * to audit finding 2.1.
     *
     * @param objectName the logical path (tenantId/category/entityId/filename)
     * @param tenantId   the current tenant from {@link TenantContext}; may be null
     *                   only for system/scheduler contexts that explicitly
     *                   bypass tenancy
     * @return the Drive fileId
     */
    private String resolveDriveFileId(String objectName, UUID tenantId) {
        if (objectName == null || objectName.isBlank()) {
            throw new BusinessException("objectName is required");
        }
        try {
            if (tenantId != null) {
                return jdbcTemplate.queryForObject(
                        "SELECT drive_file_id FROM drive_file_mapping WHERE object_name = ? AND tenant_id = ?",
                        String.class, objectName, tenantId);
            }
            // tenantId == null only for system contexts (e.g., orphan-detection jobs).
            // No tenant scoping in that case, but logged so abuse is traceable.
            log.warn("resolveDriveFileId called without tenant context for objectName={}", objectName);
            return jdbcTemplate.queryForObject(
                    "SELECT drive_file_id FROM drive_file_mapping WHERE object_name = ?",
                    String.class, objectName);
        } catch (EmptyResultDataAccessException e) {
            log.warn("drive_file_mapping miss: objectName={}, tenantId={}", objectName, tenantId);
            throw new AccessDeniedException("File not found or access denied");
        }
    }

    /**
     * Ensures the folder hierarchy exists for the given objectName.
     * objectName format: {tenantId}/{category}/{entityId}/{filename}
     *
     * @return the fileId of the deepest parent folder
     */
    private String ensureFolderHierarchy(String objectName) {
        try {
            String[] parts = objectName.split("/");
            // We need at least tenantId/category/entityId/filename
            if (parts.length < 4) {
                return rootFolderId;
            }

            String currentParent = rootFolderId;

            // Create/find folders for tenantId, category, entityId (skip the filename which is the last part)
            for (int i = 0; i < parts.length - 1; i++) {
                currentParent = findOrCreateFolder(parts[i], currentParent);
            }

            return currentParent;
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Failed to ensure folder hierarchy for: {}", objectName, e);
            throw new BusinessException("Failed to create folder structure in Google Drive");
        }
    }

    /**
     * Finds a subfolder by name under the given parent, or creates it if it does not exist.
     */
    private String findOrCreateFolder(String folderName, String parentFolderId) {
        try {
            // Search for existing folder
            String query = String.format(
                    "name = '%s' and '%s' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                    escapeDriveQuery(folderName), parentFolderId);

            var result = driveService.files().list()
                    .setQ(query)
                    .setFields("files(id, name)")
                    .setPageSize(1)
                    .execute();

            if (result.getFiles() != null && !result.getFiles().isEmpty()) {
                return result.getFiles().get(0).getId();
            }

            // Create the folder
            File folderMetadata = new File();
            folderMetadata.setName(folderName);
            folderMetadata.setMimeType("application/vnd.google-apps.folder");
            folderMetadata.setParents(Collections.singletonList(parentFolderId));

            File folder = driveService.files().create(folderMetadata)
                    .setFields("id")
                    .execute();

            log.debug("Created Google Drive folder: {} under parent: {}", folderName, parentFolderId);
            return folder.getId();
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Failed to find or create folder: {} under parent: {}", folderName, parentFolderId, e);
            throw new BusinessException("Failed to manage folder structure in Google Drive");
        }
    }

    /**
     * Escapes single quotes in folder/file names for Drive API query strings.
     */
    private String escapeDriveQuery(String value) {
        return value.replace("'", "\\'");
    }
}
