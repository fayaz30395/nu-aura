package com.nulogic.hrms.integration;

import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.nulogic.hrms.config.HrmsProperties;
import java.io.InputStream;
import java.util.Collections;
import org.springframework.stereotype.Service;

@Service
public class DriveService {
    private final GoogleWorkspaceClientFactory clientFactory;
    private final HrmsProperties properties;

    public DriveService(GoogleWorkspaceClientFactory clientFactory, HrmsProperties properties) {
        this.clientFactory = clientFactory;
        this.properties = properties;
    }

    public String ensureFolder(String parentId, String name) {
        try {
            Drive drive = clientFactory.driveClient();
            File metadata = new File();
            metadata.setName(name);
            metadata.setMimeType("application/vnd.google-apps.folder");
            if (parentId != null) {
                metadata.setParents(Collections.singletonList(parentId));
            }
            File created = drive.files().create(metadata)
                    .setSupportsAllDrives(true)
                    .execute();
            return created.getId();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to create Drive folder", ex);
        }
    }

    public String uploadFile(String parentId, String fileName, String mimeType, InputStream contentStream) {
        try {
            Drive drive = clientFactory.driveClient();
            File metadata = new File();
            metadata.setName(fileName);
            metadata.setParents(Collections.singletonList(parentId));
            com.google.api.client.http.InputStreamContent content =
                    new com.google.api.client.http.InputStreamContent(mimeType, contentStream);
            File created = drive.files().create(metadata, content)
                    .setSupportsAllDrives(true)
                    .execute();
            return created.getId();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to upload file", ex);
        }
    }

    public String getSharedDriveId() {
        String sharedDriveId = properties.getGoogle().getSharedDriveId();
        if (sharedDriveId == null || sharedDriveId.isBlank()) {
            throw new IllegalStateException("Shared Drive ID is not configured");
        }
        return sharedDriveId;
    }
}
