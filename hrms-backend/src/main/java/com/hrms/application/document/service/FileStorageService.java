package com.hrms.application.document.service;

import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for file storage operations using MinIO.
 * Supports uploading, downloading, and managing files for various HRMS modules.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final MinioClient minioClient;

    @Value("${app.minio.bucket:hrms-files}")
    private String defaultBucket;

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
            ensureBucketExists();

            Map<String, String> metadata = new HashMap<>();
            metadata.put("tenant-id", tenantId.toString());
            metadata.put("category", category);
            metadata.put("entity-id", entityId.toString());
            metadata.put("original-filename", file.getOriginalFilename());
            metadata.put("uploaded-at", LocalDateTime.now().toString());

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .userMetadata(metadata)
                    .build());

            log.info("File uploaded: {} to bucket: {}", objectName, defaultBucket);

            return FileUploadResult.builder()
                    .objectName(objectName)
                    .bucket(defaultBucket)
                    .originalFilename(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .category(category)
                    .entityId(entityId)
                    .uploadedAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
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
            ensureBucketExists();

            Map<String, String> metadata = new HashMap<>();
            metadata.put("tenant-id", tenantId.toString());
            metadata.put("category", category);
            metadata.put("entity-id", entityId.toString());
            metadata.put("original-filename", filename);
            metadata.put("uploaded-at", LocalDateTime.now().toString());

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .stream(inputStream, size, -1)
                    .contentType(contentType)
                    .userMetadata(metadata)
                    .build());

            log.info("File uploaded from stream: {} to bucket: {}", objectName, defaultBucket);

            return FileUploadResult.builder()
                    .objectName(objectName)
                    .bucket(defaultBucket)
                    .originalFilename(filename)
                    .contentType(contentType)
                    .size(size)
                    .category(category)
                    .entityId(entityId)
                    .uploadedAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("Failed to upload file from stream: {}", filename, e);
            throw new BusinessException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Get a pre-signed URL for downloading a file.
     */
    public String getDownloadUrl(String objectName) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .method(Method.GET)
                    .expiry(urlExpiryHours, TimeUnit.HOURS)
                    .build());
        } catch (Exception e) {
            log.error("Failed to generate download URL for: {}", objectName, e);
            throw new BusinessException("Failed to generate download URL");
        }
    }

    /**
     * Get file as InputStream.
     */
    public InputStream getFile(String objectName) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .build());
        } catch (Exception e) {
            log.error("Failed to get file: {}", objectName, e);
            throw new BusinessException("Failed to retrieve file");
        }
    }

    /**
     * Delete a file from storage.
     */
    public void deleteFile(String objectName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .build());
            log.info("File deleted: {}", objectName);
        } catch (Exception e) {
            log.error("Failed to delete file: {}", objectName, e);
            throw new BusinessException("Failed to delete file");
        }
    }

    /**
     * Check if a file exists.
     */
    public boolean fileExists(String objectName) {
        try {
            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .build());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Copy a file to a new location.
     */
    public String copyFile(String sourceObjectName, String category, UUID newEntityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String destinationObjectName = generateObjectName(tenantId, category, newEntityId,
                sourceObjectName.substring(sourceObjectName.lastIndexOf('/') + 1));

        try {
            minioClient.copyObject(CopyObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(destinationObjectName)
                    .source(CopySource.builder()
                            .bucket(defaultBucket)
                            .object(sourceObjectName)
                            .build())
                    .build());

            log.info("File copied from {} to {}", sourceObjectName, destinationObjectName);
            return destinationObjectName;
        } catch (Exception e) {
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

    private void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder()
                    .bucket(defaultBucket)
                    .build());

            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder()
                        .bucket(defaultBucket)
                        .build());
                log.info("Created bucket: {}", defaultBucket);
            }
        } catch (Exception e) {
            log.error("Failed to ensure bucket exists: {}", defaultBucket, e);
            throw new BusinessException("Failed to initialize storage");
        }
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
