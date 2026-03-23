package com.hrms.common.config;

import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MinIO client configuration.
 * Activated only when app.storage.provider=minio (or when the property is absent, for backward compatibility).
 */
@Configuration
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "minio", matchIfMissing = true)
@Slf4j
public class MinioConfig {

    @Value("${app.minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${app.minio.access-key:minioadmin}")
    private String accessKey;

    @Value("${app.minio.secret-key:minioadmin}")
    private String secretKey;

    @Bean
    public MinioClient minioClient() {
        log.info("Initializing MinIO client with endpoint: {}", endpoint);
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
