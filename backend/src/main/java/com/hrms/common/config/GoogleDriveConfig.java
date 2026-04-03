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
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Google Drive API configuration and storage provider bean.
 *
 * <p>When the credentials file exists, initializes a real Google Drive service.
 * When not found (local dev without credentials), falls back to a no-op mock
 * so the backend starts without file storage support.</p>
 */
@Configuration
@Slf4j
public class GoogleDriveConfig {

    @Value("${app.google-drive.credentials-path:config/google-drive-dev-credentials.json}")
    private String credentialsPath;

    @Value("${app.google-drive.root-folder-id:}")
    private String rootFolderId;

    @Value("${app.google-drive.application-name:NU-AURA-HRMS}")
    private String applicationName;

    @Bean
    public StorageProvider storageProvider() throws GeneralSecurityException, IOException {
        File credFile = new File(credentialsPath);
        if (!credFile.exists()) {
            log.warn("Google Drive credentials not found at '{}' — starting with mock StorageProvider. " +
                    "File upload/download will not work. Set GOOGLE_DRIVE_CREDENTIALS_PATH to enable.", credentialsPath);
            return mockProvider();
        }

        log.info("Initializing Google Drive storage provider with credentials: {}", credentialsPath);
        GoogleCredentials credentials = GoogleCredentials
                .fromStream(new FileInputStream(credFile))
                .createScoped(Collections.singletonList(DriveScopes.DRIVE));
        Drive drive = new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName(applicationName)
                .build();
        return new GoogleDriveStorageProvider(drive, rootFolderId);
    }

    private StorageProvider mockProvider() {
        return new StorageProvider() {
            @Override
            public String upload(String n, InputStream in, long s, String ct, Map<String, String> m) {
                log.warn("MockStorageProvider.upload({}) — no-op", n);
                return n;
            }

            @Override
            public String getDownloadUrl(String n, int h) {
                return "/mock-file/" + n;
            }

            @Override
            public InputStream download(String n) {
                return InputStream.nullInputStream();
            }

            @Override
            public void delete(String n) {
                log.warn("MockStorageProvider.delete({}) — no-op", n);
            }

            @Override
            public boolean exists(String n) {
                return false;
            }

            @Override
            public String copy(String src, String dst) {
                return dst;
            }

            @Override
            public void ensureStorageReady() {
            }

            @Override
            public List<StoredObjectInfo> listObjects(String p) {
                return List.of();
            }
        };
    }
}
