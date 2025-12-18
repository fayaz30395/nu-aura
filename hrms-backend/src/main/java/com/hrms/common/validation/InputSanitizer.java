package com.hrms.common.validation;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Utility class for sanitizing and validating user input.
 * Helps prevent XSS, SQL injection, and other security issues.
 */
@Component
public class InputSanitizer {

    // Pattern to detect potential XSS attacks
    private static final Pattern XSS_PATTERN = Pattern.compile(
            "<script[^>]*>.*?</script>|<[^>]+on\\w+\\s*=|javascript:|vbscript:|data:",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    // Pattern to detect potential SQL injection
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
            "('|\"|--)|(;\\s*(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC))",
            Pattern.CASE_INSENSITIVE);

    // Pattern for valid email
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");

    // Pattern for valid phone number
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "^[+]?[0-9\\s\\-()]{7,20}$");

    // Pattern for alphanumeric with spaces
    private static final Pattern ALPHANUMERIC_SPACE_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9\\s]+$");

    // Pattern for safe text (letters, numbers, common punctuation)
    private static final Pattern SAFE_TEXT_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9\\s.,!?@#$%&*()\\-_+=:;'\"\\[\\]{}]+$");

    /**
     * Sanitize text by removing potentially dangerous content.
     */
    public String sanitizeText(String input) {
        if (input == null) {
            return null;
        }

        // Remove null bytes
        String sanitized = input.replace("\u0000", "");

        // HTML encode dangerous characters
        sanitized = sanitized
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");

        // Trim whitespace
        return sanitized.trim();
    }

    /**
     * Sanitize text for display only (preserve formatting but escape HTML).
     */
    public String sanitizeForDisplay(String input) {
        if (input == null) {
            return null;
        }

        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    /**
     * Check if input contains potential XSS attack patterns.
     */
    public boolean containsXss(String input) {
        if (input == null || input.isEmpty()) {
            return false;
        }
        return XSS_PATTERN.matcher(input).find();
    }

    /**
     * Check if input contains potential SQL injection patterns.
     */
    public boolean containsSqlInjection(String input) {
        if (input == null || input.isEmpty()) {
            return false;
        }
        return SQL_INJECTION_PATTERN.matcher(input).find();
    }

    /**
     * Validate email format.
     */
    public boolean isValidEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * Validate phone number format.
     */
    public boolean isValidPhone(String phone) {
        if (phone == null || phone.isEmpty()) {
            return false;
        }
        return PHONE_PATTERN.matcher(phone).matches();
    }

    /**
     * Validate alphanumeric text (with spaces).
     */
    public boolean isAlphanumeric(String input) {
        if (input == null || input.isEmpty()) {
            return false;
        }
        return ALPHANUMERIC_SPACE_PATTERN.matcher(input).matches();
    }

    /**
     * Validate text contains only safe characters.
     */
    public boolean isSafeText(String input) {
        if (input == null || input.isEmpty()) {
            return true;
        }
        return SAFE_TEXT_PATTERN.matcher(input).matches();
    }

    /**
     * Sanitize and validate input - throws exception if dangerous content detected.
     */
    public String sanitizeAndValidate(String input, String fieldName) {
        if (input == null) {
            return null;
        }

        if (containsXss(input)) {
            throw new IllegalArgumentException(
                    String.format("Invalid input in field '%s': potentially malicious content detected", fieldName));
        }

        if (containsSqlInjection(input)) {
            throw new IllegalArgumentException(
                    String.format("Invalid input in field '%s': invalid characters detected", fieldName));
        }

        return sanitizeText(input);
    }

    /**
     * Truncate string to maximum length.
     */
    public String truncate(String input, int maxLength) {
        if (input == null) {
            return null;
        }
        if (input.length() <= maxLength) {
            return input;
        }
        return input.substring(0, maxLength);
    }

    /**
     * Normalize whitespace (collapse multiple spaces to single space).
     */
    public String normalizeWhitespace(String input) {
        if (input == null) {
            return null;
        }
        return input.replaceAll("\\s+", " ").trim();
    }
}
