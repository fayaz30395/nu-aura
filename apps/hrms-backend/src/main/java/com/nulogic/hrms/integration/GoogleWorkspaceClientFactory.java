package com.nulogic.hrms.integration;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.drive.Drive;
import com.google.api.services.gmail.Gmail;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.nulogic.hrms.config.HrmsProperties;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class GoogleWorkspaceClientFactory {
    private static final List<String> DRIVE_SCOPES = List.of("https://www.googleapis.com/auth/drive");
    private static final List<String> GMAIL_SCOPES = List.of("https://www.googleapis.com/auth/gmail.send");
    private static final List<String> CALENDAR_SCOPES = List.of("https://www.googleapis.com/auth/calendar.events");

    private final HrmsProperties properties;

    public GoogleWorkspaceClientFactory(HrmsProperties properties) {
        this.properties = properties;
    }

    public Drive driveClient() {
        return new Drive.Builder(httpTransport(), GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials(properties.getGoogle().getDelegatedUser(), DRIVE_SCOPES)))
                .setApplicationName("nulogic-hrms")
                .build();
    }

    public Gmail gmailClient() {
        return new Gmail.Builder(httpTransport(), GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials(properties.getGoogle().getDelegatedUser(), GMAIL_SCOPES)))
                .setApplicationName("nulogic-hrms")
                .build();
    }

    public Calendar calendarClient(String userEmail) {
        return new Calendar.Builder(httpTransport(), GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials(userEmail, CALENDAR_SCOPES)))
                .setApplicationName("nulogic-hrms")
                .build();
    }

    private GoogleCredentials credentials(String subject, List<String> scopes) {
        try {
            GoogleCredentials credentials = loadServiceAccountCredentials().createScoped(scopes);
            if (subject != null && !subject.isBlank()) {
                credentials = ((ServiceAccountCredentials) credentials).createDelegated(subject);
            }
            return credentials;
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to load Google service account credentials", ex);
        }
    }

    private ServiceAccountCredentials loadServiceAccountCredentials() throws IOException {
        String json = properties.getGoogle().getServiceAccountJson();
        if (json == null || json.isBlank()) {
            throw new IllegalStateException("Service account JSON is not configured");
        }
        try (InputStream stream = openServiceAccountStream(json)) {
            return ServiceAccountCredentials.fromStream(stream);
        }
    }

    private InputStream openServiceAccountStream(String value) throws IOException {
        if (value.trim().startsWith("{")) {
            return new ByteArrayInputStream(value.getBytes(StandardCharsets.UTF_8));
        }
        return new FileInputStream(value);
    }

    private com.google.api.client.http.HttpTransport httpTransport() {
        try {
            return GoogleNetHttpTransport.newTrustedTransport();
        } catch (GeneralSecurityException | IOException ex) {
            throw new IllegalStateException("Unable to initialize Google HTTP transport", ex);
        }
    }
}
