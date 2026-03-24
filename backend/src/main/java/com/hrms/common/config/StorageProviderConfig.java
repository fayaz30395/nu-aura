package com.hrms.common.config;

import com.hrms.application.document.service.MinioStorageProvider;
import com.hrms.application.document.service.StorageProvider;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Conditional storage provider bean configuration.
 * Selects between MinIO and Google Drive based on app.storage.provider property.
 * Default: minio (backward compatible).
 *
 * <p>The Google Drive StorageProvider bean is defined in {@link GoogleDriveConfig}
 * to avoid a class-level import of {@code com.google.api.services.drive.Drive}.
 * When the Drive API jar is absent from the classpath (e.g. local dev without the
 * dependency), a top-level import would cause a {@code ClassNotFoundException}
 * that prevents even the MinIO bean from being registered.</p>
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
}
