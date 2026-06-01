package com.nulogic.common.config;

import com.nulogic.infrastructure.sms.TwilioConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Fails production startup when required real-user integrations are still in
 * local/mock/default mode.
 */
@Component
@RequiredArgsConstructor
public class ProductionReadinessValidator implements ApplicationRunner {

    private static final List<String> PLACEHOLDER_VALUES = List.of(
            "your-email@gmail.com",
            "your-app-password",
            "noreply@hrms.com"
    );

    private static final List<String> PLACEHOLDER_TOKENS = List.of(
            "change_me",
            "example.com",
            "yourdomain",
            "your-domain",
            "yourprovider"
    );

    private final Environment environment;
    private final TwilioConfig twilioConfig;

    @Override
    public void run(ApplicationArguments args) {
        if (!isProductionProfile()) {
            return;
        }

        List<String> errors = new ArrayList<>();
        requireEnabled("app.security.captcha.enabled", errors);
        requireNonPlaceholder("app.security.captcha.site-key", errors);
        requireNonPlaceholder("app.security.captcha.secret-key", errors);
        requireNonPlaceholder("app.security.encryption.key", errors);
        requireEnabled("app.security.virusscan.enabled", errors);
        requireNonPlaceholder("app.google-drive.credentials-path", errors);
        requireNonPlaceholder("app.google-drive.root-folder-id", errors);
        requireNonPlaceholder("spring.mail.host", errors);
        requireNonPlaceholder("spring.mail.username", errors);
        requireNonPlaceholder("spring.mail.password", errors);
        requireNonPlaceholder("spring.mail.from", errors);
        requireCalendarSyncConfigured(errors);

        if (twilioConfig.isMockMode()) {
            errors.add("twilio.mock-mode must be false in production");
        }
        if (!twilioConfig.isConfigured()) {
            errors.add("Twilio credentials are required in production: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER");
        }
        requireNonPlaceholderValue("TWILIO_ACCOUNT_SID", twilioConfig.getAccountSid(), errors);
        requireNonPlaceholderValue("TWILIO_AUTH_TOKEN", twilioConfig.getAuthToken(), errors);
        requireNonPlaceholderValue("TWILIO_FROM_NUMBER", twilioConfig.getFromNumber(), errors);

        if (!errors.isEmpty()) {
            throw new IllegalStateException("Production readiness check failed: " + String.join("; ", errors));
        }
    }

    private boolean isProductionProfile() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> profile.equalsIgnoreCase("prod")
                        || profile.equalsIgnoreCase("production"));
    }

    private void requireEnabled(String property, List<String> errors) {
        if (!environment.getProperty(property, Boolean.class, false)) {
            errors.add(property + " must be true in production");
        }
    }

    private void requireNonPlaceholder(String property, List<String> errors) {
        String value = environment.getProperty(property, "");
        if (isMissingOrPlaceholder(value)) {
            errors.add(property + " must be configured with a non-placeholder value in production");
        }
    }

    private void requireNonPlaceholderValue(String label, String value, List<String> errors) {
        if (isMissingOrPlaceholder(value)) {
            errors.add(label + " must be configured with a non-placeholder value in production");
        }
    }

    private void requireCalendarSyncConfigured(List<String> errors) {
        if (environment.getProperty("calendar.sync.mock-mode", Boolean.class, false)) {
            errors.add("calendar.sync.mock-mode must be false in production");
        }

        boolean googleConfigured = hasNonPlaceholder("calendar.google.client-id")
                && hasNonPlaceholder("calendar.google.client-secret")
                && hasNonPlaceholder("calendar.google.redirect-uri");
        boolean outlookConfigured = hasNonPlaceholder("calendar.outlook.client-id")
                && hasNonPlaceholder("calendar.outlook.client-secret")
                && hasNonPlaceholder("calendar.outlook.tenant-id")
                && hasNonPlaceholder("calendar.outlook.redirect-uri");

        if (!googleConfigured && !outlookConfigured) {
            errors.add("At least one real calendar provider must be configured in production: Google or Outlook");
        }
    }

    private boolean hasNonPlaceholder(String property) {
        return !isMissingOrPlaceholder(environment.getProperty(property, ""));
    }

    private boolean isMissingOrPlaceholder(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String normalized = value.toLowerCase();
        return PLACEHOLDER_VALUES.contains(value)
                || PLACEHOLDER_TOKENS.stream().anyMatch(normalized::contains);
    }
}
