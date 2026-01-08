package com.nulogic.hrms.integration;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.stereotype.Service;

@Service
public class GmailService {
    private final GoogleWorkspaceClientFactory clientFactory;

    public GmailService(GoogleWorkspaceClientFactory clientFactory) {
        this.clientFactory = clientFactory;
    }

    public void sendEmail(String to, String subject, String body) {
        try {
            String raw = "To: " + to + "\r\n" +
                    "Subject: " + subject + "\r\n" +
                    "Content-Type: text/html; charset=UTF-8\r\n\r\n" +
                    body;
            byte[] encoded = Base64.getUrlEncoder().encode(raw.getBytes(StandardCharsets.UTF_8));
            Message message = new Message();
            message.setRaw(new String(encoded, StandardCharsets.UTF_8));

            Gmail gmail = clientFactory.gmailClient();
            gmail.users().messages().send("me", message).execute();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to send email", ex);
        }
    }
}
