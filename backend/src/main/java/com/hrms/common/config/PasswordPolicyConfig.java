package com.hrms.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for password policy enforcement.
 *
 * <p>Configure via application.yml:
 * <pre>
 * app:
 *   security:
 *     password:
 *       min-length: 12
 *       require-uppercase: true
 *       require-lowercase: true
 *       require-digit: true
 *       require-special: true
 *       max-consecutive-chars: 3
 *       history-count: 5
 * </pre>
 *
 * <p>P0 Stabilization: Implements OWASP password policy recommendations.
 */
@Configuration
@ConfigurationProperties(prefix = "app.security.password")
@Data
public class PasswordPolicyConfig {

    /**
     * Minimum password length. OWASP recommends at least 12 characters.
     */
    private int minLength = 12;

    /**
     * Maximum password length. Set high to allow passphrases.
     */
    private int maxLength = 128;

    /**
     * Require at least one uppercase letter (A-Z).
     */
    private boolean requireUppercase = true;

    /**
     * Require at least one lowercase letter (a-z).
     */
    private boolean requireLowercase = true;

    /**
     * Require at least one digit (0-9).
     */
    private boolean requireDigit = true;

    /**
     * Require at least one special character (!@#$%^&*...).
     */
    private boolean requireSpecial = true;

    /**
     * Maximum consecutive identical characters allowed.
     * E.g., "aaa" fails if maxConsecutiveChars = 2.
     */
    private int maxConsecutiveChars = 3;

    /**
     * Number of previous passwords to remember.
     * User cannot reuse any of the last N passwords.
     * Set to 0 to disable password history check.
     */
    private int historyCount = 5;

    /**
     * Maximum password age in days.
     * Set to 0 to disable password expiration.
     */
    private int maxAgeDays = 90;

    /**
     * Common passwords to reject (checked against a blocklist).
     */
    private boolean rejectCommonPasswords = true;

    /**
     * Reject passwords containing the user's email or name.
     */
    private boolean rejectUserInfo = true;
}
