package com.hrms.application.document.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.Permission;
import com.hrms.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Drive-based storage provider.
 * Used for production environments.
 * <p>
 * Google Drive uses fileId-based access rather than path-based.
 * The objectName parameter doubles as the fileId when using this provider:
 * - On upload, the objectName (logical path) is stored as a custom property on the Drive file,
 * and the returned value is the Google Drive fileId.
 * - On download/delete/exists, the objectName is treated as the Google Drive fileId.
 */
@Slf4j
public class GoogleDriveStorageProvider implements StorageProvider {

    private final Drive driveService;
    private final String rootFolderId;

    public GoogleDriveStorageProvider(Drive driveService, String rootFolderId) {
        this.driveService = driveService;
        this.rootFolderId = rootFolderId;
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
            return uploadedFile.getId();
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive upload failed for object: {}", objectName, e);
            throw new BusinessException("Failed to upload file to Google Drive: " + e.getMessage());
        }
    }

    @Override
    public String getDownloadUrl(String objectName, int expiryHours) {
        try {
            // Create a temporary reader permission for the file
            Permission permission = new Permission()
                    .setType("anyone")
                    .setRole("reader");

            driveService.permissions().create(objectName, permission)
                    .setFields("id")
                    .execute();

            File file = driveService.files().get(objectName)
                    .setFields("webContentLink")
                    .execute();

            String downloadUrl = file.getWebContentLink();
            log.info("Google Drive download URL generated for fileId: {}", objectName);
            return downloadUrl;
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive download URL generation failed for fileId: {}", objectName, e);
            throw new BusinessException("Failed to generate download URL from Google Drive");
        }
    }

    @Override
    public InputStream download(String objectName) {
        try {
            return driveService.files().get(objectName)
                    .executeMediaAsInputStream();
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive download failed for fileId: {}", objectName, e);
            throw new BusinessException("Failed to retrieve file from Google Drive");
        }
    }

    @Override
    public void delete(String objectName) {
        try {
            driveService.files().delete(objectName).execute();
            log.info("Google Drive file deleted: fileId={}", objectName);
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            log.error("Google Drive delete failed for fileId: {}", objectName, e);
            throw new BusinessException("Failed to delete file from Google Drive");
        }
    }

    @Override
    public boolean exists(String objectName) {
        try {
            driveService.files().get(objectName)
                    .setFields("id")
                    .execute();
            return true;
        } catch (Exception e) { // Intentional broad catch — Google Drive API may throw checked and unchecked exceptions
            return false;
        }
    }

    @Override
    public String copy(String sourceObjectName, String destinationObjectName) {
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

            File copiedFile = driveService.files().copy(sourceObjectName, copiedFileMetadata)
                    .setFields("id, name")
                    .execute();

            log.info("Google Drive file copied: sourceId={}, newId={}", sourceObjectName, copiedFile.getId());
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
