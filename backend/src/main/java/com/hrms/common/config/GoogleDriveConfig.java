package com.hrms.common.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Google Drive API configuration.
 * Activated only when app.storage.provider=google-drive.
 */
@Configuration
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
}
