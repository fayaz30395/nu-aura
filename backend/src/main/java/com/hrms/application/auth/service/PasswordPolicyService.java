package com.hrms.application.auth.service;

import com.hrms.common.config.PasswordPolicyConfig;
import com.hrms.common.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Service for validating passwords against configurable security policies.
 *
 * <p>Implements OWASP password policy recommendations:
 * <ul>
 *   <li>Minimum length (default: 12 characters)</li>
 *   <li>Character complexity (uppercase, lowercase, digit, special)</li>
 *   <li>No consecutive identical characters</li>
 *   <li>No common passwords</li>
 *   <li>No user information in password</li>
 * </ul>
 *
 * <p>P0 Stabilization: Critical security control for enterprise compliance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordPolicyService {

    private final PasswordPolicyConfig config;
    private final PasswordEncoder passwordEncoder;

    // Common passwords blocklist (top 100 most common)
    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
            "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
            "ashley", "bailey", "shadow", "123123", "654321", "superman", "qazwsx",
            "michael", "football", "password1", "password123", "welcome", "jesus",
            "ninja", "mustang", "password1!", "admin", "admin123", "root", "toor",
            "pass", "test", "guest", "master123", "changeme", "welcome1", "welcome123",
            "passw0rd", "p@ssw0rd", "p@ssword", "qwerty123", "123qwe", "zaq12wsx",
            "1qaz2wsx", "qwertyuiop", "1234567890", "123456789", "000000", "111111",
            "121212", "123321", "666666", "696969", "7777777", "888888", "abcdef",
            "access", "amanda", "andrea", "andrew", "angel", "anthony", "arsenal",
            "austin", "badboy", "batman", "biteme", "brandon", "buster", "charlie",
            "chelsea", "computer", "cookie", "corvette", "cowboy", "dakota", "dallas",
            "daniel", "david", "diamond", "donald", "edward", "eminem", "ferrari",
            "flower", "freedom", "fuckoff", "fuckyou", "george", "ginger", "golden",
            "hammer", "hannah", "harley", "heather", "hello", "hockey", "hunter",
            "jackson", "jasmine", "jennifer", "jessica", "johnny", "jordan", "joshua"
    );

    // Regex patterns for character class validation
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL_PATTERN = Pattern.compile("[!@#$%^&*(),.?\":{}|<>\\[\\]\\\\;'`~_+=/-]");

    /**
     * Validate a new password against all configured policies.
     *
     * @param password the password to validate
     * @param userEmail optional user email to check for inclusion
     * @param userName optional user name to check for inclusion
     * @throws ValidationException if password fails any policy check
     */
    public void validatePassword(String password, String userEmail, String userName) {
        List<String> violations = new ArrayList<>();

        // Check for null or empty
        if (password == null || password.isEmpty()) {
            throw new ValidationException("Password cannot be empty");
        }

        // Length checks
        if (password.length() < config.getMinLength()) {
            violations.add(String.format("Password must be at least %d characters long", config.getMinLength()));
        }
        if (password.length() > config.getMaxLength()) {
            violations.add(String.format("Password cannot exceed %d characters", config.getMaxLength()));
        }

        // Character complexity checks
        if (config.isRequireUppercase() && !UPPERCASE_PATTERN.matcher(password).find()) {
            violations.add("Password must contain at least one uppercase letter (A-Z)");
        }
        if (config.isRequireLowercase() && !LOWERCASE_PATTERN.matcher(password).find()) {
            violations.add("Password must contain at least one lowercase letter (a-z)");
        }
        if (config.isRequireDigit() && !DIGIT_PATTERN.matcher(password).find()) {
            violations.add("Password must contain at least one digit (0-9)");
        }
        if (config.isRequireSpecial() && !SPECIAL_PATTERN.matcher(password).find()) {
            violations.add("Password must contain at least one special character (!@#$%^&*...)");
        }

        // Consecutive character check
        if (config.getMaxConsecutiveChars() > 0 && hasConsecutiveChars(password, config.getMaxConsecutiveChars())) {
            violations.add(String.format("Password cannot contain more than %d consecutive identical characters",
                    config.getMaxConsecutiveChars()));
        }

        // Common password check
        if (config.isRejectCommonPasswords() && isCommonPassword(password)) {
            violations.add("Password is too common. Please choose a more unique password");
        }

        // User info check
        if (config.isRejectUserInfo()) {
            if (userEmail != null && containsUserInfo(password, userEmail)) {
                violations.add("Password cannot contain your email address");
            }
            if (userName != null && containsUserInfo(password, userName)) {
                violations.add("Password cannot contain your name");
            }
        }

        // If any violations, throw exception with all messages
        if (!violations.isEmpty()) {
            String message = String.join("; ", violations);
            log.warn("Password policy violation: {}", message);
            throw new ValidationException(message);
        }

        log.debug("Password passed all policy checks");
    }

    /**
     * Simplified validation without user context (for password reset with token).
     */
    public void validatePassword(String password) {
        validatePassword(password, null, null);
    }

    /**
     * Check if a password matches any in the user's password history.
     *
     * @param password the new password
     * @param passwordHistory list of previous password hashes
     * @return true if password matches any in history
     */
    public boolean isPasswordInHistory(String password, List<String> passwordHistory) {
        if (passwordHistory == null || passwordHistory.isEmpty()) {
            return false;
        }

        int historyCount = config.getHistoryCount();
        if (historyCount <= 0) {
            return false;
        }

        // Check against last N passwords
        int checkCount = Math.min(historyCount, passwordHistory.size());
        for (int i = 0; i < checkCount; i++) {
            if (passwordEncoder.matches(password, passwordHistory.get(i))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if password contains consecutive identical characters.
     */
    private boolean hasConsecutiveChars(String password, int maxConsecutive) {
        char lastChar = 0;
        int count = 0;

        for (char c : password.toCharArray()) {
            if (c == lastChar) {
                count++;
                if (count >= maxConsecutive) {
                    return true;
                }
            } else {
                count = 1;
                lastChar = c;
            }
        }
        return false;
    }

    /**
     * Check if password is in the common passwords list.
     */
    private boolean isCommonPassword(String password) {
        String lower = password.toLowerCase();
        // Check exact match
        if (COMMON_PASSWORDS.contains(lower)) {
            return true;
        }
        // Check with common substitutions removed (l33t speak)
        String normalized = lower
                .replace("0", "o")
                .replace("1", "i")
                .replace("3", "e")
                .replace("4", "a")
                .replace("5", "s")
                .replace("7", "t")
                .replace("@", "a")
                .replace("$", "s")
                .replace("!", "i");
        return COMMON_PASSWORDS.contains(normalized);
    }

    /**
     * Check if password contains user information.
     */
    private boolean containsUserInfo(String password, String userInfo) {
        if (userInfo == null || userInfo.length() < 3) {
            return false;
        }
        String lowerPassword = password.toLowerCase();

        // For email, check the part before @
        if (userInfo.contains("@")) {
            String emailPrefix = userInfo.split("@")[0].toLowerCase();
            if (emailPrefix.length() >= 3 && lowerPassword.contains(emailPrefix)) {
                return true;
            }
        }

        // Check each word in the name (min 3 chars)
        for (String part : userInfo.toLowerCase().split("\\s+")) {
            if (part.length() >= 3 && lowerPassword.contains(part)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the configured minimum password length (for frontend validation hints).
     */
    public int getMinLength() {
        return config.getMinLength();
    }

    /**
     * Get password policy requirements as a user-friendly message.
     */
    public String getPolicyDescription() {
        StringBuilder sb = new StringBuilder();
        sb.append("Password requirements: ");
        sb.append(String.format("minimum %d characters", config.getMinLength()));
        if (config.isRequireUppercase()) sb.append(", at least one uppercase letter");
        if (config.isRequireLowercase()) sb.append(", at least one lowercase letter");
        if (config.isRequireDigit()) sb.append(", at least one number");
        if (config.isRequireSpecial()) sb.append(", at least one special character");
        return sb.toString();
    }
}
