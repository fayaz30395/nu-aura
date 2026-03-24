package com.hrms.common.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.hrms.application.document.service.GoogleDriveStorageProvider;
import com.hrms.application.document.service.StorageProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Google Drive API configuration and storage provider bean.
 *
 * <p>Activated only when <strong>both</strong> conditions are met:</p>
 * <ol>
 *   <li>{@code app.storage.provider=google-drive} (property gate)</li>
 *   <li>{@code com.google.api.services.drive.Drive} is on the classpath (class gate)</li>
 * </ol>
 *
 * <p>The dual guard ({@code @ConditionalOnProperty} + {@code @ConditionalOnClass})
 * prevents {@code ClassNotFoundException} in environments where the Google Drive API
 * jar is absent from the classpath — even if the property is accidentally set.
 * {@code @ConditionalOnClass} uses the {@code name} attribute (String) rather than
 * the {@code value} attribute (Class literal) so that the JVM never attempts to
 * resolve the Drive class at annotation-processing time.</p>
 *
 * <p>The {@link StorageProvider} bean was moved here from {@code StorageProviderConfig}
 * to keep all Drive-dependent code behind this single conditional gate.</p>
 */
@Configuration
@ConditionalOnClass(name = "com.google.api.services.drive.Drive")
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "google-drive")
@Slf4j
public class GoogleDriveConfig {

    @Value("${app.google-drive.credentials-path}")
    private String credentialsPath;

    @Value("${app.google-drive.root-folder-id}")
    private String rootFolderId;

    @Value("${app.google-drive.application-name:NU-AURA-HRMS}")
    private String applicationName;

    @Bean
    public Drive googleDriveService() throws GeneralSecurityException, IOException {
        log.info("Initializing Google Drive service with credentials from: {}", credentialsPath);

        GoogleCredentials credentials = GoogleCredentials
                .fromStream(new FileInputStream(credentialsPath))
                .createScoped(Collections.singletonList(DriveScopes.DRIVE));

        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName(applicationName)
                .build();
    }

    @Bean
    public String googleDriveRootFolderId() {
        return rootFolderId;
    }

    @Bean
    public StorageProvider googleDriveStorageProvider(
            Drive googleDriveService) {
        log.info("Configuring Google Drive storage provider with root folder: {}", rootFolderId);
        return new GoogleDriveStorageProvider(googleDriveService, rootFolderId);
    }
}
