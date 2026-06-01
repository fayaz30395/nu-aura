package com.nulogic.common.config;

import com.nulogic.infrastructure.sms.TwilioConfig;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionReadinessValidatorTest {

    @Test
    void skipsValidationOutsideProductionProfiles() {
        MockEnvironment environment = new MockEnvironment().withProperty("spring.profiles.active", "dev");
        environment.setActiveProfiles("dev");
        TwilioConfig twilio = new TwilioConfig();

        ProductionReadinessValidator validator = new ProductionReadinessValidator(environment, twilio);

        assertThatCode(() -> validator.run(null)).doesNotThrowAnyException();
    }

    @Test
    void failsProductionWhenRealUserIntegrationsAreMissing() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        TwilioConfig twilio = new TwilioConfig();
        twilio.setMockMode(true);

        ProductionReadinessValidator validator = new ProductionReadinessValidator(environment, twilio);

        assertThatThrownBy(() -> validator.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Production readiness check failed")
                .hasMessageContaining("app.security.captcha.enabled must be true")
                .hasMessageContaining("twilio.mock-mode must be false");
    }

    @Test
    void acceptsProductionWhenRequiredIntegrationsAreConfigured() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment
                .withProperty("app.security.captcha.enabled", "true")
                .withProperty("app.security.captcha.site-key", "site-key")
                .withProperty("app.security.captcha.secret-key", "secret-key")
                .withProperty("app.security.encryption.key", "0123456789abcdef0123456789abcdef")
                .withProperty("app.security.virusscan.enabled", "true")
                .withProperty("app.google-drive.credentials-path", "/etc/secrets/google-drive/credentials.json")
                .withProperty("app.google-drive.root-folder-id", "drive-folder")
                .withProperty("spring.mail.host", "smtp.nulogic.io")
                .withProperty("spring.mail.username", "mailer@nulogic.io")
                .withProperty("spring.mail.password", "mail-secret")
                .withProperty("spring.mail.from", "noreply@nulogic.io")
                .withProperty("calendar.sync.mock-mode", "false")
                .withProperty("calendar.google.client-id", "google-client-id")
                .withProperty("calendar.google.client-secret", "google-client-secret")
                .withProperty("calendar.google.redirect-uri", "https://app.nulogic.io/calendar/google/callback");

        TwilioConfig twilio = new TwilioConfig();
        twilio.setMockMode(false);
        twilio.setAccountSid("AC123");
        twilio.setAuthToken("token");
        twilio.setFromNumber("+15551234567");

        ProductionReadinessValidator validator = new ProductionReadinessValidator(environment, twilio);

        assertThatCode(() -> validator.run(null)).doesNotThrowAnyException();
    }

    @Test
    void failsProductionWhenTemplatePlaceholdersRemainConfigured() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment
                .withProperty("app.security.captcha.enabled", "true")
                .withProperty("app.security.captcha.site-key", "CHANGE_ME_recaptcha_site_key")
                .withProperty("app.security.captcha.secret-key", "secret-key")
                .withProperty("app.security.encryption.key", "CHANGE_ME_encryption_key")
                .withProperty("app.security.virusscan.enabled", "true")
                .withProperty("app.google-drive.credentials-path", "/etc/secrets/google-drive/credentials.json")
                .withProperty("app.google-drive.root-folder-id", "CHANGE_ME_google_drive_folder_id")
                .withProperty("spring.mail.host", "smtp.yourprovider.com")
                .withProperty("spring.mail.username", "mailer@yourdomain.com")
                .withProperty("spring.mail.password", "mail-secret")
                .withProperty("spring.mail.from", "noreply@yourdomain.com")
                .withProperty("calendar.sync.mock-mode", "true");

        TwilioConfig twilio = new TwilioConfig();
        twilio.setMockMode(false);
        twilio.setAccountSid("CHANGE_ME_twilio_account_sid");
        twilio.setAuthToken("token");
        twilio.setFromNumber("+15551234567");

        ProductionReadinessValidator validator = new ProductionReadinessValidator(environment, twilio);

        assertThatThrownBy(() -> validator.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.security.captcha.site-key must be configured with a non-placeholder value")
                .hasMessageContaining("app.security.encryption.key must be configured with a non-placeholder value")
                .hasMessageContaining("app.google-drive.root-folder-id must be configured with a non-placeholder value")
                .hasMessageContaining("spring.mail.host must be configured with a non-placeholder value")
                .hasMessageContaining("TWILIO_ACCOUNT_SID must be configured with a non-placeholder value")
                .hasMessageContaining("calendar.sync.mock-mode must be false")
                .hasMessageContaining("At least one real calendar provider must be configured");
    }
}
