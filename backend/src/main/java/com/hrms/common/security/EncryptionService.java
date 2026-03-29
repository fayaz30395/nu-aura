package com.hrms.common.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * Service for encrypting/decrypting sensitive data like API keys.
 *
 * <p>Uses <strong>AES-256-GCM</strong> (authenticated encryption with associated data).
 * Each encryption produces a unique ciphertext due to the random 12-byte IV,
 * and the 128-bit GCM tag provides integrity verification on decryption.</p>
 *
 * <p>Format: {@code GCMv1:<base64(iv || ciphertext || gcmTag)>}</p>
 *
 * <p>Legacy values encrypted with the old ECB scheme (no prefix) are transparently
 * decrypted on read. They will be re-encrypted in GCM format when re-saved.</p>
 *
 * <p>Uses the same key as {@link CryptoConverter} ({@code app.security.encryption.key})
 * to avoid key proliferation.</p>
 *
 * @see CryptoConverter
 */
@Slf4j
@Service
public class EncryptionService {

    private static final String GCM_ALGORITHM  = "AES/GCM/NoPadding";
    private static final String ECB_ALGORITHM  = "AES";         // legacy read-only
    private static final String GCM_PREFIX     = "GCMv1:";
    private static final int    GCM_IV_LENGTH  = 12;            // 96-bit IV (NIST recommended)
    private static final int    GCM_TAG_LENGTH = 128;           // bits

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${app.security.encryption.key}")
    private String encryptionKey;

    private byte[] keyBytes;

    /**
     * Validate and derive the AES key at startup.
     * Fails fast if the key is missing, blank, or the wrong length.
     */
    @PostConstruct
    void initKey() {
        if (encryptionKey == null || encryptionKey.isBlank()) {
            throw new IllegalStateException(
                "app.security.encryption.key is not configured. " +
                "Provide a 32-byte key via APP_SECURITY_ENCRYPTION_KEY environment variable."
            );
        }
        keyBytes = encryptionKey.getBytes();
        // Derive a 32-byte key via SHA-256 if the raw key is not a valid AES length
        if (keyBytes.length != 16 && keyBytes.length != 24 && keyBytes.length != 32) {
            try {
                keyBytes = java.security.MessageDigest.getInstance("SHA-256").digest(keyBytes);
            } catch (java.security.NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 not available", e);
            }
        }
        if (keyBytes.length != 16 && keyBytes.length != 24 && keyBytes.length != 32) {
            throw new IllegalStateException(
                String.format(
                    "app.security.encryption.key must be exactly 16, 24, or 32 bytes (got %d). " +
                    "For AES-256, use a 32-byte key.", keyBytes.length
                )
            );
        }
    }

    /**
     * Encrypt a string value using AES-256-GCM.
     *
     * <p>Each call generates a random 12-byte IV, so encrypting the same
     * plaintext twice produces different ciphertexts.</p>
     *
     * @param value plaintext to encrypt (null/blank passes through unchanged)
     * @return GCM-prefixed Base64 ciphertext, or the original value if null/blank
     */
    public String encrypt(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE,
                    new SecretKeySpec(keyBytes, "AES"),
                    new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(value.getBytes());

            // Stored blob = iv || ciphertext+tag
            byte[] blob = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, blob, 0, iv.length);
            System.arraycopy(ciphertext, 0, blob, iv.length, ciphertext.length);

            return GCM_PREFIX + Base64.getEncoder().encodeToString(blob);
        } catch (java.security.GeneralSecurityException e) {
            log.error("AES-GCM encryption failed", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Decrypt a string value.
     *
     * <p>Transparently handles both GCM-prefixed values (new format) and
     * legacy ECB-encoded values (old format). Legacy values are not
     * re-encrypted in place — the caller should persist the re-encrypted
     * value if needed.</p>
     *
     * @param encryptedValue ciphertext to decrypt (null/blank passes through unchanged)
     * @return decrypted plaintext
     */
    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank()) {
            return encryptedValue;
        }

        try {
            if (encryptedValue.startsWith(GCM_PREFIX)) {
                return decryptGcm(encryptedValue.substring(GCM_PREFIX.length()));
            }
            // Legacy path: value was encrypted with old ECB scheme
            log.warn("Decrypting legacy ECB-encrypted value; re-encrypt with encrypt() to upgrade to AES-GCM");
            return decryptLegacyEcb(encryptedValue);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private String decryptGcm(String base64Blob) throws Exception {
        byte[] blob = Base64.getDecoder().decode(base64Blob);
        byte[] iv   = Arrays.copyOfRange(blob, 0, GCM_IV_LENGTH);
        byte[] ct   = Arrays.copyOfRange(blob, GCM_IV_LENGTH, blob.length);

        Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE,
                new SecretKeySpec(keyBytes, "AES"),
                new GCMParameterSpec(GCM_TAG_LENGTH, iv));

        return new String(cipher.doFinal(ct));
    }

    /**
     * Legacy AES/ECB decryption — used only for values written before the GCM migration.
     * The old EncryptionService used raw AES (ECB mode) with a Base64-encoded key
     * derived from zero-padded/truncated key bytes.
     */
    private String decryptLegacyEcb(String base64Data) throws Exception {
        // Legacy key derivation: normalize to 32 bytes via pad/truncate, then Base64-encode,
        // then Base64-decode back. This round-trip was in the old normalizeKey()/generateKey().
        byte[] legacyNormalized = new byte[32];
        if (keyBytes.length >= 32) {
            System.arraycopy(keyBytes, 0, legacyNormalized, 0, 32);
        } else {
            System.arraycopy(keyBytes, 0, legacyNormalized, 0, keyBytes.length);
            // Remaining bytes stay 0 — matches the old zero-padding behavior
        }
        byte[] legacyKey = Base64.getDecoder().decode(Base64.getEncoder().encodeToString(legacyNormalized));

        Cipher cipher = Cipher.getInstance(ECB_ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(legacyKey, "AES"));
        return new String(cipher.doFinal(Base64.getDecoder().decode(base64Data)));
    }
}
