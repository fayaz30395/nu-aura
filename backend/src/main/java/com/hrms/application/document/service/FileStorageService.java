package com.hrms.application.document.service;

import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for file storage operations.
 * Delegates to a StorageProvider implementation (MinIO or Google Drive)
 * based on the active profile configuration.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final StorageProvider storageProvider;

    @Value("${app.minio.url-expiry-hours:24}")
    private int urlExpiryHours;

    // File categories
    public static final String CATEGORY_PROFILE_PHOTO = "profile-photos";
    public static final String CATEGORY_DOCUMENTS = "documents";
    public static final String CATEGORY_PAYSLIPS = "payslips";
    public static final String CATEGORY_LETTERS = "letters";
    public static final String CATEGORY_ATTACHMENTS = "attachments";
    public static final String CATEGORY_REPORTS = "reports";

    // Allowed file types
    private static final Map<String, Long> ALLOWED_TYPES = Map.of(
            "image/jpeg", 5L * 1024 * 1024,      // 5MB
            "image/png", 5L * 1024 * 1024,       // 5MB
            "image/gif", 2L * 1024 * 1024,       // 2MB
            "application/pdf", 20L * 1024 * 1024, // 20MB
            "application/msword", 20L * 1024 * 1024,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 20L * 1024 * 1024,
            "application/vnd.ms-excel", 20L * 1024 * 1024,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 20L * 1024 * 1024,
            "text/csv", 10L * 1024 * 1024,
            "text/plain", 5L * 1024 * 1024
    );

    /**
     * Upload a file to storage.
     */
    public FileUploadResult uploadFile(MultipartFile file, String category, UUID entityId) {
        validateFile(file);

        UUID tenantId = TenantContext.getCurrentTenant();
        String objectName = generateObjectName(tenantId, category, entityId, file.getOriginalFilename());

        try {
            storageProvider.ensureStorageReady();

            Map<String, String> metadata = new HashMap<>();
            metadata.put("tenant-id", tenantId.toString());
            metadata.put("category", category);
            metadata.put("entity-id", entityId.toString());
            metadata.put("original-filename", file.getOriginalFilename());
            metadata.put("uploaded-at", LocalDateTime.now().toString());

            String storageId = storageProvider.upload(objectName, file.getInputStream(), file.getSize(),
                    file.getContentType(), metadata);

            log.info("File uploaded: {} (storageId: {})", objectName, storageId);

            return FileUploadResult.builder()
                    .objectName(storageId)
                    .bucket("storage")
                    .originalFilename(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .category(category)
                    .entityId(entityId)
                    .uploadedAt(LocalDateTime.now())
                    .build();

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
            throw new BusinessException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Upload a file from InputStream (for generated files like reports).
     */
    public FileUploadResult uploadFile(InputStream inputStream, String filename, String contentType,
                                        long size, String category, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String objectName = generateObjectName(tenantId, category, entityId, filename);

        try {
            storageProvider.ensureStorageReady();

            Map<String, String> metadata = new HashMap<>();
            metadata.put("tenant-id", tenantId.toString());
            metadata.put("category", category);
            metadata.put("entity-id", entityId.toString());
            metadata.put("original-filename", filename);
            metadata.put("uploaded-at", LocalDateTime.now().toString());

            String storageId = storageProvider.upload(objectName, inputStream, size, contentType, metadata);

            log.info("File uploaded from stream: {} (storageId: {})", objectName, storageId);

            return FileUploadResult.builder()
                    .objectName(storageId)
                    .bucket("storage")
                    .originalFilename(filename)
                    .contentType(contentType)
                    .size(size)
                    .category(category)
                    .entityId(entityId)
                    .uploadedAt(LocalDateTime.now())
                    .build();

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to upload file from stream: {}", filename, e);
            throw new BusinessException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Get a pre-signed URL for downloading a file.
     */
    @Transactional(readOnly = true)
    public String getDownloadUrl(String objectName) {
        try {
            return storageProvider.getDownloadUrl(objectName, urlExpiryHours);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to generate download URL for: {}", objectName, e);
            throw new BusinessException("Failed to generate download URL");
        }
    }

    /**
     * Get file as InputStream.
     */
    @Transactional(readOnly = true)
    public InputStream getFile(String objectName) {
        try {
            return storageProvider.download(objectName);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to get file: {}", objectName, e);
            throw new BusinessException("Failed to retrieve file");
        }
    }

    /**
     * Delete a file from storage.
     */
    @Transactional
    public void deleteFile(String objectName) {
        try {
            storageProvider.delete(objectName);
            log.info("File deleted: {}", objectName);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to delete file: {}", objectName, e);
            throw new BusinessException("Failed to delete file");
        }
    }

    /**
     * Check if a file exists.
     */
    public boolean fileExists(String objectName) {
        return storageProvider.exists(objectName);
    }

    /**
     * Copy a file to a new location.
     */
    public String copyFile(String sourceObjectName, String category, UUID newEntityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String destinationObjectName = generateObjectName(tenantId, category, newEntityId,
                sourceObjectName.substring(sourceObjectName.lastIndexOf('/') + 1));

        try {
            String storageId = storageProvider.copy(sourceObjectName, destinationObjectName);
            log.info("File copied from {} to {} (storageId: {})", sourceObjectName, destinationObjectName, storageId);
            return storageId;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to copy file: {}", sourceObjectName, e);
            throw new BusinessException("Failed to copy file");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.containsKey(contentType)) {
            throw new BusinessException("File type not allowed: " + contentType);
        }

        long maxSize = ALLOWED_TYPES.get(contentType);
        if (file.getSize() > maxSize) {
            throw new BusinessException("File size exceeds limit: " + (maxSize / 1024 / 1024) + "MB");
        }

        // Magic byte validation to prevent MIME spoofing attacks
        validateMagicBytes(file, contentType);
    }

    /**
     * Validate that file magic bytes match the declared content type.
     * Prevents attackers from uploading malicious files disguised as images/documents.
     */
    private void validateMagicBytes(MultipartFile file, String contentType) {
        byte[] headerBytes = new byte[16];
        try (InputStream is = file.getInputStream()) {
            int bytesRead = is.read(headerBytes);
            if (bytesRead < 1) {
                throw new BusinessException("Unable to read file content for validation");
            }
        } catch (IOException e) {
            log.error("Failed to read file header for magic byte validation", e);
            throw new BusinessException("Unable to validate file content");
        }

        String detectedType = detectMimeType(headerBytes);
        String declaredCategory = getMimeCategory(contentType);
        String detectedCategory = getMimeCategory(detectedType);

        // Reject if the broad category doesn't match (e.g., declared image/* but detected application/zip)
        if (!declaredCategory.equals(detectedCategory)) {
            log.warn("MIME spoofing detected: declared={}, detected={}, filename={}",
                    contentType, detectedType, file.getOriginalFilename());
            throw new BusinessException("File content does not match declared type: " + contentType);
        }
    }

    /**
     * Detect MIME type from file magic bytes (file signature).
     */
    private String detectMimeType(byte[] headerBytes) {
        // JPEG: FF D8 FF
        if (headerBytes.length >= 3
                && headerBytes[0] == (byte) 0xFF
                && headerBytes[1] == (byte) 0xD8
                && headerBytes[2] == (byte) 0xFF) {
            return "image/jpeg";
        }
        // PNG: 89 50 4E 47
        if (headerBytes.length >= 4
                && headerBytes[0] == (byte) 0x89
                && headerBytes[1] == 0x50
                && headerBytes[2] == 0x4E
                && headerBytes[3] == 0x47) {
            return "image/png";
        }
        // PDF: 25 50 44 46
        if (headerBytes.length >= 4
                && headerBytes[0] == 0x25
                && headerBytes[1] == 0x50
                && headerBytes[2] == 0x44
                && headerBytes[3] == 0x46) {
            return "application/pdf";
        }
        // GIF: 47 49 46 38
        if (headerBytes.length >= 4
                && headerBytes[0] == 0x47
                && headerBytes[1] == 0x49
                && headerBytes[2] == 0x46
                && headerBytes[3] == 0x38) {
            return "image/gif";
        }
        // XLSX/DOCX (ZIP container): 50 4B 03 04
        if (headerBytes.length >= 4
                && headerBytes[0] == 0x50
                && headerBytes[1] == 0x4B
                && headerBytes[2] == 0x03
                && headerBytes[3] == 0x04) {
            return "application/zip";
        }
        // CSV/TXT: starts with printable ASCII
        if (headerBytes.length > 0
                && headerBytes[0] >= 0x20
                && headerBytes[0] <= 0x7E) {
            return "text/plain";
        }
        return "application/octet-stream";
    }

    // MIME categories used for magic byte cross-checking
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/gif");
    private static final Set<String> DOCUMENT_TYPES = Set.of(
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/zip");
    private static final Set<String> TEXT_TYPES = Set.of("text/csv", "text/plain");

    /**
     * Map a specific MIME type to a broad category for cross-validation.
     */
    private String getMimeCategory(String mimeType) {
        if (IMAGE_TYPES.contains(mimeType)) return "image";
        if (DOCUMENT_TYPES.contains(mimeType)) return "document";
        if (TEXT_TYPES.contains(mimeType)) return "text";
        return "unknown";
    }

    private String generateObjectName(UUID tenantId, String category, UUID entityId, String originalFilename) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        String extension = getFileExtension(originalFilename);
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);

        return String.format("%s/%s/%s/%s_%s%s",
                tenantId,
                category,
                entityId,
                timestamp,
                uniqueId,
                extension);
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    /**
     * Result of a file upload operation.
     */
    @lombok.Builder
    @lombok.Data
    public static class FileUploadResult {
        private String objectName;
        private String bucket;
        private String originalFilename;
        private String contentType;
        private long size;
        private String category;
        private UUID entityId;
        private LocalDateTime uploadedAt;
    }
}
