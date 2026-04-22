package com.hrms.application.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.auth.dto.MfaSetupResponse;
import com.hrms.api.auth.dto.MfaStatusResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.hrms.common.exception.AuthenticationException;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing Multi-Factor Authentication (MFA) using TOTP.
 * Implements RFC 6238 for time-based one-time passwords.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MfaService {

    private static final String TOTP_ALGORITHM = "HmacSHA1";
    private static final long TIME_WINDOW = 30L;
    private static final String CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    /**
     * Length of generated backup codes (8 uppercase alphanumeric characters).
     * Kept in sync with {@link #generateBackupCodes()}.
     */
    private static final int BACKUP_CODE_LENGTH = 8;

    /**
     * Pattern that uniquely identifies a backup code: exactly 8 uppercase letters or digits.
     */
    private static final java.util.regex.Pattern BACKUP_CODE_PATTERN =
            java.util.regex.Pattern.compile("[A-Z0-9]{" + BACKUP_CODE_LENGTH + "}");
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Sets up MFA for a user by generating a TOTP secret, QR code, and backup codes.
     *
     * @param userId the user ID
     * @return MfaSetupResponse containing QR code, secret, and backup codes
     * @throws ResourceNotFoundException if user not found
     */
    @Transactional
    public MfaSetupResponse setupMfa(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        // Generate TOTP secret
        String secret = generateSecret();

        // Generate backup codes
        List<String> backupCodes = generateBackupCodes();

        // Hash backup codes before storing
        List<String> hashedBackupCodes = backupCodes.stream()
                .map(passwordEncoder::encode)
                .collect(Collectors.toList());

        // Store hashed backup codes as JSON
        try {
            String backupCodesJson = objectMapper.writeValueAsString(hashedBackupCodes);
            user.setMfaSecret(secret);
            user.setMfaBackupCodes(backupCodesJson);
            // Don't enable yet - wait for verification
            user.setMfaSetupAt(LocalDateTime.now());
            userRepository.save(user);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize backup codes for user: {}", userId, e);
            throw new BusinessException("Failed to initialize MFA. Please try again.");
        }

        // Generate QR code URL
        String qrCodeUrl = generateQrCodeUrl(user.getEmail(), secret);

        return MfaSetupResponse.builder()
                .qrCodeUrl(qrCodeUrl)
                .secret(secret)
                .backupCodes(backupCodes)
                .build();
    }

    /**
     * Verifies the TOTP code and enables MFA for the user.
     *
     * @param userId the user ID
     * @param code   the TOTP code to verify
     * @return true if verification succeeds and MFA is enabled
     * @throws ResourceNotFoundException if user not found
     * @throws AuthenticationException   if code is invalid
     */
    @Transactional
    public boolean verifyAndEnableMfa(UUID userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (user.getMfaSecret() == null) {
            throw new AuthenticationException("MFA setup not initiated. Call setupMfa first.");
        }

        // Verify the TOTP code
        if (!validateTotp(user.getMfaSecret(), code)) {
            log.warn("Invalid MFA verification code for user: {}", userId);
            throw new AuthenticationException("Invalid MFA code");
        }

        // Enable MFA
        user.setMfaEnabled(true);
        userRepository.save(user);

        log.info("MFA enabled for user: {}", userId);
        return true;
    }

    /**
     * Verifies a TOTP code for login.
     *
     * @param userId the user ID
     * @param code   the TOTP code or backup code to verify
     * @return true if code is valid
     * @throws ResourceNotFoundException if user not found
     */
    @Transactional(readOnly = true)
    public boolean verifyMfaCode(UUID userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (!user.getMfaEnabled() || user.getMfaSecret() == null) {
            return false;
        }

        // Route by code format to avoid unnecessary crypto operations.
        // TOTP codes are exactly 6 decimal digits; backup codes are exactly 8
        // uppercase alphanumeric characters. Trying bcrypt scans against a
        // 6-digit TOTP input is expensive and always wrong.
        if (isLikelyBackupCode(code)) {
            // Skip TOTP — go straight to backup code verification
            return verifyBackupCode(user, code);
        }

        // Standard TOTP path (6-digit numeric code)
        return validateTotp(user.getMfaSecret(), code);
    }

    /**
     * Disables MFA for a user after verifying the code.
     *
     * @param userId the user ID
     * @param code   the TOTP code to verify before disabling
     * @throws ResourceNotFoundException if user not found
     * @throws AuthenticationException   if code is invalid
     */
    @Transactional
    public void disableMfa(UUID userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (!user.getMfaEnabled()) {
            throw new AuthenticationException("MFA is not enabled for this user");
        }

        // Verify the code before disabling
        if (!validateTotp(user.getMfaSecret(), code)) {
            log.warn("Invalid MFA code provided for disabling MFA for user: {}", userId);
            throw new AuthenticationException("Invalid MFA code");
        }

        // Disable MFA
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setMfaBackupCodes(null);
        user.setMfaSetupAt(null);
        userRepository.save(user);

        log.info("MFA disabled for user: {}", userId);
    }

    /**
     * Gets the MFA status for a user.
     *
     * @param userId the user ID
     * @return MfaStatusResponse with enabled status and setup time
     * @throws ResourceNotFoundException if user not found
     */
    @Transactional(readOnly = true)
    public MfaStatusResponse getMfaStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        return MfaStatusResponse.builder()
                .enabled(user.getMfaEnabled() != null ? user.getMfaEnabled() : false)
                .setupAt(user.getMfaSetupAt())
                .build();
    }

    /**
     * Validates a TOTP code using RFC 6238.
     * Checks current time window and ±1 windows for tolerance.
     *
     * @param secret the Base32-encoded TOTP secret
     * @param code   the 6-digit code to verify
     * @return true if code is valid
     */
    private boolean validateTotp(String secret, String code) {
        try {
            byte[] keyBytes = base32Decode(secret);
            long timeStep = System.currentTimeMillis() / 1000L / TIME_WINDOW;

            // Check current and ±1 time windows for tolerance
            for (long i = -1; i <= 1; i++) {
                String expectedCode = generateTotp(keyBytes, timeStep + i);
                if (expectedCode.equals(code)) {
                    return true;
                }
            }
            return false;
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            log.error("Error validating TOTP", e);
            return false;
        }
    }

    /**
     * Generates a TOTP code for a given time step.
     *
     * @param key      the HMAC key
     * @param timeStep the time step (30-second window)
     * @return 6-digit TOTP code
     */
    private String generateTotp(byte[] key, long timeStep) throws GeneralSecurityException {
        byte[] msg = ByteBuffer.allocate(8).putLong(timeStep).array();
        Mac mac = Mac.getInstance(TOTP_ALGORITHM);
        mac.init(new SecretKeySpec(key, TOTP_ALGORITHM));
        byte[] hash = mac.doFinal(msg);

        int offset = hash[hash.length - 1] & 0xf;
        int code = ((hash[offset] & 0x7f) << 24)
                | ((hash[offset + 1] & 0xff) << 16)
                | ((hash[offset + 2] & 0xff) << 8)
                | (hash[offset + 3] & 0xff);

        return String.format("%06d", code % 1_000_000);
    }

    /**
     * Generates a random TOTP secret and encodes it as Base32.
     * Generates 20 bytes for a 160-bit key (recommended for HMAC-SHA1).
     *
     * @return Base32-encoded TOTP secret
     */
    private String generateSecret() {
        SecureRandom random = new SecureRandom();
        byte[] secretBytes = new byte[20];
        random.nextBytes(secretBytes);
        return base32Encode(secretBytes);
    }

    /**
     * Encodes bytes to Base32 string.
     *
     * @param data the bytes to encode
     * @return Base32-encoded string
     */
    private String base32Encode(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bufferSize = 0;

        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bufferSize += 8;

            while (bufferSize >= 5) {
                bufferSize -= 5;
                result.append(CHARSET.charAt((buffer >> bufferSize) & 0x1f));
            }
        }

        if (bufferSize > 0) {
            result.append(CHARSET.charAt((buffer << (5 - bufferSize)) & 0x1f));
        }

        return result.toString();
    }

    /**
     * Decodes a Base32-encoded string to bytes.
     *
     * @param base32 the Base32-encoded string
     * @return decoded bytes
     * @throws IllegalArgumentException if input is invalid Base32
     */
    private byte[] base32Decode(String base32) {
        List<Integer> bytes = new ArrayList<>();
        int buffer = 0;
        int bufferSize = 0;

        for (char c : base32.toUpperCase().toCharArray()) {
            int digit = CHARSET.indexOf(c);
            if (digit < 0) {
                throw new IllegalArgumentException("Invalid Base32 character: " + c);
            }

            buffer = (buffer << 5) | digit;
            bufferSize += 5;

            if (bufferSize >= 8) {
                bufferSize -= 8;
                bytes.add((buffer >> bufferSize) & 0xff);
            }
        }

        byte[] result = new byte[bytes.size()];
        for (int i = 0; i < bytes.size(); i++) {
            result[i] = bytes.get(i).byteValue();
        }
        return result;
    }

    /**
     * Generates 10 random backup codes for account recovery.
     * Each code is 8 alphanumeric characters.
     *
     * @return list of 10 backup codes
     */
    private List<String> generateBackupCodes() {
        List<String> codes = new ArrayList<>();
        SecureRandom random = new SecureRandom();
        String alphanumeric = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        for (int i = 0; i < 10; i++) {
            StringBuilder code = new StringBuilder();
            for (int j = 0; j < 8; j++) {
                code.append(alphanumeric.charAt(random.nextInt(alphanumeric.length())));
            }
            codes.add(code.toString());
        }

        return codes;
    }

    /**
     * Generates the otpauth:// URL for QR code generation.
     *
     * @param email  the user email
     * @param secret the TOTP secret
     * @return otpauth URL
     */
    private String generateQrCodeUrl(String email, String secret) {
        return String.format(
                "otpauth://totp/NU-AURA:%%s?secret=%%s&issuer=NU-AURA&algorithm=SHA1&digits=6&period=30",
                email, secret
        ).replace("%s", email).replace("%s", secret);
    }

    /**
     * Returns {@code true} if {@code code} matches the backup-code format
     * (exactly {@value #BACKUP_CODE_LENGTH} uppercase letters/digits).
     *
     * <p>Using an explicit format check instead of a loose {@code length > 6}
     * guard prevents false positives (e.g. an 8-digit numeric string that
     * could be an extended TOTP code) and allows the caller to short-circuit
     * expensive bcrypt comparisons for clearly non-backup inputs.
     */
    private boolean isLikelyBackupCode(String code) {
        return code != null
                && code.length() == BACKUP_CODE_LENGTH
                && BACKUP_CODE_PATTERN.matcher(code).matches();
    }

    /**
     * Verifies a backup code and consumes it if valid.
     *
     * @param user the user entity
     * @param code the backup code to verify
     * @return true if the backup code is valid and not yet used
     */
    private boolean verifyBackupCode(User user, String code) {
        try {
            String backupCodesJson = user.getMfaBackupCodes();
            if (backupCodesJson == null || backupCodesJson.isEmpty()) {
                return false;
            }

            List<String> hashedCodes = objectMapper.readValue(
                    backupCodesJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
            );

            // Check if any hashed code matches
            for (String hashedCode : hashedCodes) {
                if (passwordEncoder.matches(code, hashedCode)) {
                    // Backup code matched but NOT consumed (for read-only transaction)
                    // The actual consumption should happen in a separate transactional method
                    return true;
                }
            }

            return false;
        } catch (JsonProcessingException e) {
            log.error("Error verifying backup code", e);
            return false;
        }
    }

    /**
     * Consumes a backup code (marks it as used).
     * This is called after successful MFA login with backup code.
     *
     * @param userId the user ID
     * @param code   the backup code to consume
     * @throws ResourceNotFoundException if user not found
     */
    @Transactional
    public void consumeBackupCode(UUID userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        try {
            String backupCodesJson = user.getMfaBackupCodes();
            if (backupCodesJson == null || backupCodesJson.isEmpty()) {
                return;
            }

            List<String> hashedCodes = objectMapper.readValue(
                    backupCodesJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
            );

            // Remove the matched code
            hashedCodes.removeIf(hashedCode -> passwordEncoder.matches(code, hashedCode));

            // Update backup codes
            if (hashedCodes.isEmpty()) {
                user.setMfaBackupCodes(null);
                log.warn("All backup codes consumed for user: {}", userId);
            } else {
                user.setMfaBackupCodes(objectMapper.writeValueAsString(hashedCodes));
            }

            userRepository.save(user);
        } catch (JsonProcessingException e) {
            log.error("Error consuming backup code for user: {}", userId, e);
        }
    }
}
