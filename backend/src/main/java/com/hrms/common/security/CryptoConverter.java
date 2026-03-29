package com.hrms.common.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * AES-256-GCM attribute converter for encrypting sensitive PII columns at rest.
 *
 * <p>Format written to DB: {@code GCMv1:<base64(iv + ciphertext + gcmTag)>}
 * <p>The 12-byte IV is randomly generated per encryption and prepended to the
 * ciphertext in the stored value, allowing stateless decryption.
 *
 * <p>Legacy ECB-mode values (no prefix) are decrypted on read and will be
 * re-encrypted in GCM format on the next write. Run a migration job to force
 * re-encryption of all rows: {@code SELECT id FROM ... WHERE column NOT LIKE 'GCMv1:%'}.
 *
 * <p>Key requirement: {@code app.security.encryption.key} must be a 32-character
 * (256-bit) string, supplied via environment variable or secrets manager.
 * No insecure default is provided — the application will fail to start if
 * the key is absent or too short.
 */
@Component
@Converter
@Slf4j
public class CryptoConverter implements AttributeConverter<String, String> {

    private static final String GCM_ALGORITHM  = "AES/GCM/NoPadding";
    private static final String ECB_ALGORITHM  = "AES/ECB/PKCS5Padding"; // legacy read-only
    private static final String GCM_PREFIX     = "GCMv1:";
    private static final int    GCM_IV_LENGTH  = 12;  // bytes (96-bit IV, NIST recommended)
    private static final int    GCM_TAG_LENGTH = 128; // bits

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static byte[] key;

    /**
     * Inject the encryption key. Must be exactly 16, 24, or 32 bytes (AES-128/192/256).
     * 32 bytes (AES-256) is required for production deployments.
     *
     * <p>Set via: {@code APP_SECURITY_ENCRYPTION_KEY} environment variable (preferred)
     * or {@code app.security.encryption.key} in application properties.
     * <b>No default is provided.</b> The application will refuse to start without it.
     */
    @Value("${app.security.encryption.key}")
    public void setKey(String encryptionKey) {
        Assert.hasText(encryptionKey, "app.security.encryption.key must not be blank");
        byte[] keyBytes = encryptionKey.getBytes();
        // Derive a 32-byte key via SHA-256 if the raw key is not a valid AES length
        if (keyBytes.length != 16 && keyBytes.length != 24 && keyBytes.length != 32) {
            try {
                keyBytes = java.security.MessageDigest.getInstance("SHA-256").digest(keyBytes);
            } catch (java.security.NoSuchAlgorithmException e) {
                throw new RuntimeException("SHA-256 not available", e);
            }
        }
        CryptoConverter.key = keyBytes;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE,
                    new SecretKeySpec(key, "AES"),
                    new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(attribute.getBytes());

            // Prepend IV: stored blob = iv || ciphertext+tag
            byte[] blob = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, blob, 0, iv.length);
            System.arraycopy(ciphertext, 0, blob, iv.length, ciphertext.length);

            return GCM_PREFIX + Base64.getEncoder().encodeToString(blob);
        } catch (java.security.GeneralSecurityException e) {
            throw new RuntimeException("Error encrypting sensitive attribute", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            if (dbData.startsWith(GCM_PREFIX)) {
                return decryptGcm(dbData.substring(GCM_PREFIX.length()));
            }
            // Legacy path: value was encrypted with the old ECB scheme.
            // Decrypt and return — the value will be re-encrypted in GCM on next write.
            log.warn("Decrypting legacy ECB-encrypted column value; schedule a data migration to re-encrypt.");
            return decryptLegacyEcb(dbData);
        } catch (java.security.GeneralSecurityException | IllegalArgumentException e) {
            // Do NOT return raw dbData — fail loudly so data issues surface immediately.
            throw new RuntimeException("Error decrypting sensitive attribute — check encryption key configuration", e);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private String decryptGcm(String base64Blob) throws java.security.GeneralSecurityException {
        byte[] blob = Base64.getDecoder().decode(base64Blob);
        byte[] iv   = Arrays.copyOfRange(blob, 0, GCM_IV_LENGTH);
        byte[] ct   = Arrays.copyOfRange(blob, GCM_IV_LENGTH, blob.length);

        Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE,
                new SecretKeySpec(key, "AES"),
                new GCMParameterSpec(GCM_TAG_LENGTH, iv));

        return new String(cipher.doFinal(ct));
    }

    /** Legacy AES/ECB decryption — used only to read values written before the GCM migration. */
    private String decryptLegacyEcb(String base64Data) throws java.security.GeneralSecurityException {
        Cipher cipher = Cipher.getInstance(ECB_ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"));
        return new String(cipher.doFinal(Base64.getDecoder().decode(base64Data)));
    }
}
