package com.hrms.application.document.service;

import java.io.InputStream;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

/**
 * Abstraction for file storage operations.
 * Current implementation: Google Drive (all environments).
 */
public interface StorageProvider {

    /**
     * Upload a file to storage.
     *
     * @param objectName  logical path/key for the object
     * @param inputStream file content stream
     * @param size        file size in bytes
     * @param contentType MIME type of the file
     * @param metadata    additional metadata key-value pairs
     * @return the storage identifier (objectName for MinIO, fileId for Google Drive)
     */
    String upload(String objectName, InputStream inputStream, long size, String contentType, Map<String, String> metadata);

    /**
     * Generate a download URL for a stored file.
     *
     * @param objectName  storage identifier
     * @param expiryHours hours until the URL expires
     * @return a pre-signed or temporary download URL
     */
    String getDownloadUrl(String objectName, int expiryHours);

    /**
     * Download a file as an InputStream.
     *
     * @param objectName storage identifier
     * @return file content stream
     */
    InputStream download(String objectName);

    /**
     * Delete a file from storage.
     *
     * @param objectName storage identifier
     */
    void delete(String objectName);

    /**
     * Check if a file exists in storage.
     *
     * @param objectName storage identifier
     * @return true if the file exists
     */
    boolean exists(String objectName);

    /**
     * Copy a file to a new location.
     *
     * @param sourceObjectName      source storage identifier
     * @param destinationObjectName destination storage identifier
     * @return the storage identifier of the copy
     */
    String copy(String sourceObjectName, String destinationObjectName);

    /**
     * Ensure the storage backend is ready (e.g., bucket exists, folder hierarchy created).
     */
    void ensureStorageReady();

    /**
     * List all stored object names/identifiers, optionally filtered by prefix.
     * Used by orphan file detection to cross-reference against database records.
     *
     * @param prefix optional path prefix to filter (e.g., tenantId); null or empty lists all
     * @return a list of {@link StoredObjectInfo} entries
     */
    List<StoredObjectInfo> listObjects(String prefix);

    /**
     * Metadata about a stored object, used for orphan detection.
     */
    record StoredObjectInfo(String objectName, ZonedDateTime lastModified, boolean isDirectory) {
    }
}
