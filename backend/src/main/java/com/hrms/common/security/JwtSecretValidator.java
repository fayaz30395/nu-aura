package com.hrms.common.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Validates JWT secret configuration at application startup.
 * Fails fast if the secret is missing, empty, or insufficiently secure.
 * <p>
 * Security requirements:
 * - JWT_SECRET environment variable must be set
 * - Secret must be at least 32 characters (256 bits for HMAC-SHA256)
 * - Secret must not be a known weak/default value
 */
@Component
@Slf4j
public class JwtSecretValidator {

    private static final int MINIMUM_SECRET_LENGTH = 32;
    private static final String[] FORBIDDEN_SECRETS = {
            "secret",
            "your-secret-key",
            "change-me",
            "changeme",
            "your-256-bit-secret",
            "your-jwt-secret",
            "jwt-secret",
            "mysecret",
            "test",
            "password"
    };

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @PostConstruct
    public void validateJwtSecret() {
        // Check if secret is provided
        if (jwtSecret == null || jwtSecret.isBlank()) {
            log.error("SECURITY VIOLATION: JWT_SECRET environment variable is not set!");
            log.error("Set JWT_SECRET with a cryptographically secure random string of at least 32 characters.");
            throw new SecurityException(
                    "JWT_SECRET environment variable is required. " +
                            "Application cannot start without a properly configured JWT secret."
            );
        }

        // Check minimum length (256 bits = 32 bytes for HMAC-SHA256)
        if (jwtSecret.length() < MINIMUM_SECRET_LENGTH) {
            log.error("SECURITY VIOLATION: JWT_SECRET is too short ({} chars, minimum {} required)",
                    jwtSecret.length(), MINIMUM_SECRET_LENGTH);
            throw new SecurityException(
                    "JWT_SECRET must be at least " + MINIMUM_SECRET_LENGTH + " characters. " +
                            "Current length: " + jwtSecret.length()
            );
        }

        // Check for known weak/default secrets (case-insensitive)
        String secretLower = jwtSecret.toLowerCase();
        for (String forbidden : FORBIDDEN_SECRETS) {
            if (secretLower.equals(forbidden)) {
                log.error("SECURITY VIOLATION: JWT_SECRET appears to be a weak or default value!");
                throw new SecurityException(
                        "JWT_SECRET appears to be a weak or default value. " +
                                "Use a cryptographically secure random string."
                );
            }
        }

        // Log success without revealing the secret
        log.info("JWT secret validation passed (length: {} chars)", jwtSecret.length());
    }
}
