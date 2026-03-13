package com.hrms.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

/**
 * Service for encrypting/decrypting sensitive data like API keys
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EncryptionService {

    @Value("${encryption.key:default-secure-key-change-in-production}")
    private String encryptionKey;

    private static final String ALGORITHM = "AES";

    /**
     * Encrypt a string value
     */
    public String encrypt(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }

        try {
            SecretKey key = generateKey();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] encryptedValue = cipher.doFinal(value.getBytes());
            return Base64.getEncoder().encodeToString(encryptedValue);
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Decrypt a string value
     */
    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank()) {
            return encryptedValue;
        }

        try {
            SecretKey key = generateKey();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key);
            byte[] decodedValue = Base64.getDecoder().decode(encryptedValue);
            byte[] decryptedValue = cipher.doFinal(decodedValue);
            return new String(decryptedValue);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }

    /**
     * Generate SecretKey from encryption key string
     */
    private SecretKey generateKey() {
        byte[] decodedKey = Base64.getDecoder().decode(normalizeKey());
        return new SecretKeySpec(decodedKey, 0, decodedKey.length, ALGORITHM);
    }

    /**
     * Normalize encryption key to 32 bytes (256-bit) for AES
     */
    private String normalizeKey() {
        String key = encryptionKey;
        if (key == null || key.isBlank()) {
            throw new RuntimeException("Encryption key not configured");
        }

        // Pad or truncate to 32 bytes for 256-bit AES
        byte[] keyBytes = key.getBytes();
        byte[] normalized = new byte[32];

        if (keyBytes.length >= 32) {
            System.arraycopy(keyBytes, 0, normalized, 0, 32);
        } else {
            System.arraycopy(keyBytes, 0, normalized, 0, keyBytes.length);
            // Pad remaining bytes with zeros
            for (int i = keyBytes.length; i < 32; i++) {
                normalized[i] = 0;
            }
        }

        return Base64.getEncoder().encodeToString(normalized);
    }
}
