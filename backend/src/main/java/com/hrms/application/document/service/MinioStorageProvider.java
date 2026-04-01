package com.hrms.application.document.service;

import com.hrms.common.exception.BusinessException;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * MinIO-based storage provider.
 * Used for local development and environments where MinIO is available.
 */
@Slf4j
@RequiredArgsConstructor
public class MinioStorageProvider implements StorageProvider {

    private final MinioClient minioClient;
    private final String defaultBucket;

    @Override
    public String upload(String objectName, InputStream inputStream, long size, String contentType, Map<String, String> metadata) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .stream(inputStream, size, -1)
                    .contentType(contentType)
                    .userMetadata(metadata)
                    .build());

            log.info("MinIO upload complete: {} to bucket: {}", objectName, defaultBucket);
            return objectName;
        } catch (Exception e) { // Intentional broad catch — MinIO SDK declares throws Exception
            log.error("MinIO upload failed for object: {}", objectName, e);
            throw new BusinessException("Failed to upload file to MinIO: " + e.getMessage());
        }
    }

    @Override
    public String getDownloadUrl(String objectName, int expiryHours) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .method(Method.GET)
                    .expiry(expiryHours, TimeUnit.HOURS)
                    .build());
        } catch (Exception e) { // Intentional broad catch — MinIO SDK declares throws Exception
            log.error("MinIO download URL generation failed for: {}", objectName, e);
            throw new BusinessException("Failed to generate download URL");
        }
    }

    @Override
    public InputStream download(String objectName) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .build());
        } catch (Exception e) { // Intentional broad catch — MinIO SDK declares throws Exception
            log.error("MinIO download failed for: {}", objectName, e);
            throw new BusinessException("Failed to retrieve file from MinIO");
        }
    }

    @Override
    public void delete(String objectName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .build());
            log.info("MinIO file deleted: {}", objectName);
        } catch (Exception e) { // Intentional broad catch — MinIO SDK declares throws Exception
            log.error("MinIO delete failed for: {}", objectName, e);
            throw new BusinessException("Failed to delete file from MinIO");
        }
    }

    @Override
    public boolean exists(String objectName) {
        try {
            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(objectName)
                    .build());
            return true;
        } catch (Exception e) { // Intentional broad catch — MinIO SDK declares throws Exception
            return false;
        }
    }

    @Override
    public String copy(String sourceObjectName, String destinationObjectName) {
        try {
            minioClient.copyObject(CopyObjectArgs.builder()
                    .bucket(defaultBucket)
                    .object(destinationObjectName)
                    .source(CopySource.builder()
                            .bucket(defaultBucket)
                            .object(sourceObjectName)
                            .build())
                    .build());

            log.info("MinIO file copied from {} to {}", sourceObjectName, destinationObjectName);
            return destinationObjectName;
        } catch (Exception e) { // Intentional broad catch — MinIO SDK declares throws Exception
            log.error("MinIO copy failed from {} to {}", sourceObjectName, destinationObjectName, e);
            throw new BusinessException("Failed to copy file in MinIO");
        }
    }

    @Override
    public void ensureStorageReady() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder()
                    .bucket(defaultBucket)
                    .build());

            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder()
                        .bucket(defaultBucket)
                        .build());
                log.info("Created MinIO bucket: {}", defaultBucket);
            }
        } catch (Exception e) { // Intentional broad catch — MinIO SDK declares throws Exception
            log.error("Failed to ensure MinIO bucket exists: {}", defaultBucket, e);
            throw new BusinessException("Failed to initialize MinIO storage");
        }
    }
}
