package com.hrms.common.config;

import com.google.api.services.drive.Drive;
import com.hrms.application.document.service.GoogleDriveStorageProvider;
import com.hrms.application.document.service.MinioStorageProvider;
import com.hrms.application.document.service.StorageProvider;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Conditional storage provider bean configuration.
 * Selects between MinIO and Google Drive based on app.storage.provider property.
 * Default: minio (backward compatible).
 */
@Configuration
@Slf4j
public class StorageProviderConfig {

    @Bean
    @ConditionalOnProperty(name = "app.storage.provider", havingValue = "minio", matchIfMissing = true)
    public StorageProvider minioStorageProvider(
            MinioClient minioClient,
            @Value("${app.minio.bucket:hrms-files}") String defaultBucket) {
        log.info("Configuring MinIO storage provider with bucket: {}", defaultBucket);
        return new MinioStorageProvider(minioClient, defaultBucket);
    }

    @Bean
    @ConditionalOnProperty(name = "app.storage.provider", havingValue = "google-drive")
    public StorageProvider googleDriveStorageProvider(
            Drive googleDriveService,
            @Qualifier("googleDriveRootFolderId") String rootFolderId) {
        log.info("Configuring Google Drive storage provider with root folder: {}", rootFolderId);
        return new GoogleDriveStorageProvider(googleDriveService, rootFolderId);
    }
}
