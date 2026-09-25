package com.nulogic.common.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.function.Supplier;

/**
 * JPA AttributeConverter that transparently encrypts and decrypts String column values
 * using AES-256-GCM.
 *
 * <p>The encryption key is read from the {@code ENCRYPTION_KEY} environment variable.
 * The value must be a Base64-encoded 32-byte (256-bit) key.
 *
 * <p>Storage format: {@code Base64(IV) + ":" + Base64(ciphertext+tag)}
 * A 96-bit (12-byte) random IV is generated per encryption call to ensure
 * semantic security even when the same plaintext is stored multiple times.
 *
 * <p>Usage:
 * <pre>
 *   {@literal @}Convert(converter = EncryptedStringConverter.class)
 *   {@literal @}Column(name = "config_json", columnDefinition = "TEXT")
 *   private String configJson;
 * </pre>
 */
@Slf4j
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;   // 96 bits — NIST recommended
    private static final int GCM_TAG_LENGTH = 128;  // bits
    private static final String ENV_KEY = "ENCRYPTION_KEY";
    /**
     * Alternate env var name used by start-backend.sh and render deployment.
     */
    private static final String ENV_KEY_ALT = "APP_SECURITY_ENCRYPTION_KEY";
    /**
     * Previous-key env vars, read during a key rotation. Ciphertext written under the
     * retired key still decrypts while the re-encryption backfill drains; new writes
     * always use the current key. Unset once the backfill reports zero rows remaining.
     */
    private static final String ENV_PREV_KEY = "ENCRYPTION_KEY_PREVIOUS";
    private static final String ENV_PREV_KEY_ALT = "APP_SECURITY_ENCRYPTION_KEY_PREVIOUS";

    private final Supplier<String> configuredKeySupplier;
    private final Supplier<String> previousKeySupplier;

    /** Lazily resolved previous key; absent when no rotation is in flight. */
    private volatile SecretKeySpec previousSecretKey;
    private volatile boolean previousKeyResolved = false;

    /**
     * Lazily resolved key — avoids failing at class-load time in test contexts.
     */
    private volatile SecretKeySpec secretKey;
    /**
     * True when no encryption key is available. Avoids repeated log spam.
     */
    private volatile boolean keyMissing = false;

    public EncryptedStringConverter() {
        this(EncryptedStringConverter::resolveConfiguredKey);
    }

    EncryptedStringConverter(Supplier<String> configuredKeySupplier) {
        this(configuredKeySupplier, EncryptedStringConverter::resolvePreviousKey);
    }

    EncryptedStringConverter(Supplier<String> configuredKeySupplier, Supplier<String> previousKeySupplier) {
        this.configuredKeySupplier = configuredKeySupplier;
        this.previousKeySupplier = previousKeySupplier;
    }

    /**
     * Resolves the retired key, or {@code null} when no rotation is in flight.
     * A malformed previous key is treated as absent (logged once) rather than
     * failing every read — the current key still works.
     */
    private SecretKeySpec getPreviousKey() {
        if (previousKeyResolved) {
            return previousSecretKey;
        }
        synchronized (this) {
            if (previousKeyResolved) {
                return previousSecretKey;
            }
            String keyBase64 = previousKeySupplier.get();
            if (keyBase64 != null && !keyBase64.isBlank()) {
                try {
                    byte[] keyBytes = Base64.getDecoder().decode(keyBase64);
                    if (keyBytes.length == 32) {
                        previousSecretKey = new SecretKeySpec(keyBytes, "AES");
                    } else {
                        log.error("Previous encryption key must decode to 32 bytes, got {} — ignoring it.", keyBytes.length);
                    }
                } catch (IllegalArgumentException e) {
                    log.error("Previous encryption key is not valid Base64 — ignoring it: {}", e.getMessage());
                }
            }
            previousKeyResolved = true;
            return previousSecretKey;
        }
    }

    private static String resolvePreviousKey() {
        String keyBase64 = System.getenv(ENV_PREV_KEY);
        if (keyBase64 == null || keyBase64.isBlank()) {
            keyBase64 = System.getenv(ENV_PREV_KEY_ALT);
        }
        if (keyBase64 == null || keyBase64.isBlank()) {
            keyBase64 = System.getProperty(ENV_PREV_KEY);
        }
        if (keyBase64 == null || keyBase64.isBlank()) {
            keyBase64 = System.getProperty(ENV_PREV_KEY_ALT);
        }
        return keyBase64;
    }

    private static byte[] decrypt(SecretKeySpec key, byte[] iv, byte[] ciphertext)
            throws java.security.GeneralSecurityException {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
        return cipher.doFinal(ciphertext);
    }

    private SecretKeySpec getKey() {
        if (secretKey != null) {
            return secretKey;
        }
        if (keyMissing) {
            throw new IllegalStateException("ENCRYPTION_KEY is not configured (cached).");
        }
        synchronized (this) {
            if (secretKey != null) {
                return secretKey;
            }
            String keyBase64 = configuredKeySupplier.get();
            if (keyBase64 == null || keyBase64.isBlank()) {
                keyMissing = true;
                throw new IllegalStateException(
                        "Neither ENCRYPTION_KEY nor APP_SECURITY_ENCRYPTION_KEY environment variable is set. " +
                                "Provide a Base64-encoded 32-byte AES-256 key.");
            }
            byte[] keyBytes = Base64.getDecoder().decode(keyBase64);
            if (keyBytes.length != 32) {
                throw new IllegalStateException(
                        "ENCRYPTION_KEY must decode to exactly 32 bytes (256 bits), " +
                                "got " + keyBytes.length + " bytes.");
            }
            secretKey = new SecretKeySpec(keyBytes, "AES");
            return secretKey;
        }
    }

    private static String resolveConfiguredKey() {
        // Resolution order: env var, alt env var, then system properties (local/test override).
        String keyBase64 = System.getenv(ENV_KEY);
        if (keyBase64 == null || keyBase64.isBlank()) {
            keyBase64 = System.getenv(ENV_KEY_ALT);
        }
        if (keyBase64 == null || keyBase64.isBlank()) {
            keyBase64 = System.getProperty(ENV_KEY);
        }
        if (keyBase64 == null || keyBase64.isBlank()) {
            keyBase64 = System.getProperty(ENV_KEY_ALT);
        }
        return keyBase64;
    }

    /**
     * Encrypts the attribute value before storing it in the database.
     *
     * @param plaintext the value to encrypt; {@code null} is stored as {@code null}.
     * @return Base64(IV):Base64(ciphertext+GCM-tag)
     */
    @Override
    public String convertToDatabaseColumn(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, getKey(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            String encodedIv = Base64.getEncoder().encodeToString(iv);
            String encodedCiphertext = Base64.getEncoder().encodeToString(ciphertext);
            return encodedIv + ":" + encodedCiphertext;
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("Failed to encrypt column value", e);
        }
    }

    /**
     * Decrypts the database value when reading it into the entity.
     *
     * @param dbValue the stored encrypted value; {@code null} is returned as {@code null}.
     * @return the original plaintext
     */
    @Override
    public String convertToEntityAttribute(String dbValue) {
        if (dbValue == null) {
            return null;
        }
        try {
            String[] parts = dbValue.split(":", 2);
            if (parts.length != 2) {
                // Value was stored unencrypted (legacy data or seed data) — return as-is
                log.warn("Encrypted column contains unencrypted value (no IV:ciphertext format). Returning raw value.");
                return dbValue;
            }
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            byte[] plaintext;
            try {
                plaintext = decrypt(getKey(), iv, ciphertext);
            } catch (java.security.GeneralSecurityException currentKeyFailure) {
                // Rotation window: the row may still hold ciphertext written under the
                // retired key. Fall back to it for READS only; writes re-encrypt under
                // the current key, which is what drains the backfill.
                SecretKeySpec previous = getPreviousKey();
                if (previous == null) {
                    throw currentKeyFailure;
                }
                plaintext = decrypt(previous, iv, ciphertext);
                log.debug("Column value decrypted with the previous encryption key — pending re-encryption backfill.");
            }
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            // Base64 decode failure or unexpected format — likely legacy unencrypted data
            log.warn("Failed to decode encrypted column value (likely legacy unencrypted data): {}", e.getMessage());
            return dbValue;
        } catch (java.security.GeneralSecurityException e) {
            // Decryption failure — wrong key, corrupted ciphertext, or key rotation
            log.error("Failed to decrypt column value (key mismatch or data corruption). Returning masked placeholder.", e);
            return "***DECRYPTION_FAILED***";
        } catch (IllegalStateException e) {
            // ENCRYPTION_KEY not set or invalid
            log.error("Encryption key configuration error: {}", e.getMessage());
            return "***KEY_NOT_CONFIGURED***";
        } catch (Exception e) {
            // Catch-all: never let any decryption error crash the application
            log.error("Unexpected error decrypting column value. Returning raw value. Error: {}", e.getMessage(), e);
            return dbValue;
        }
    }
}
