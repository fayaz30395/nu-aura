package com.hrms.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

/**
 * Storage provider configuration.
 *
 * <p>The active {@link com.hrms.application.document.service.StorageProvider}
 * bean is registered by {@link GoogleDriveConfig} based on the
 * {@code app.storage.provider} property.</p>
 *
 * <p>Previously this class also registered a MinIO-based provider.
 * MinIO support was removed — all environments now use Google Drive.</p>
 */
@Configuration
@Slf4j
public class StorageProviderConfig {
    // Google Drive StorageProvider bean is defined in GoogleDriveConfig.
    // This class is retained for future storage provider registrations.
}
