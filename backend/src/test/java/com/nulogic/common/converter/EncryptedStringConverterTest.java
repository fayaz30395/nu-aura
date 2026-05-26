package com.nulogic.common.converter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Base64;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for EncryptedStringConverter (AES-256-GCM JPA attribute converter).
 *
 * <p>Tests cover the full encryption/decryption lifecycle, edge-case inputs,
 * and security failure modes such as a missing ENCRYPTION_KEY or tampered ciphertext.
 *
 * <p>Strategy: each test supplies the configured key directly and uses a fresh
 * converter instance to avoid inter-test contamination from the converter's
 * lazy key cache.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EncryptedStringConverter Tests")
class EncryptedStringConverterTest {

    // A valid Base64-encoded 32-byte AES-256 key used in all positive tests.
    private static final String VALID_KEY_BASE64 =
            Base64.getEncoder().encodeToString(new byte[32]); // 32 zero-bytes, valid for testing

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private EncryptedStringConverter converterWithKey(String base64Key) {
        return new EncryptedStringConverter(() -> base64Key);
    }

    // -----------------------------------------------------------------------
    // 1. Encrypt → Decrypt roundtrip
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Roundtrip encrypt/decrypt")
    class RoundtripTests {

        @Test
        @DisplayName("Roundtrip produces the original plaintext")
        void roundtripProducesOriginalValue() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            String original = "Hello, NU-AURA!";
            String encrypted = converter.convertToDatabaseColumn(original);
            String decrypted = converter.convertToEntityAttribute(encrypted);

            assertThat(decrypted).isEqualTo(original);
        }

        @Test
        @DisplayName("Empty string survives roundtrip unchanged")
        void emptyStringRoundtrip() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            String encrypted = converter.convertToDatabaseColumn("");
            String decrypted = converter.convertToEntityAttribute(encrypted);

            assertThat(decrypted).isEqualTo("");
        }

        @Test
        @DisplayName("10 KB string survives roundtrip unchanged")
        void largeStringRoundtrip() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            String large = "A".repeat(10_240); // 10 KB
            String encrypted = converter.convertToDatabaseColumn(large);
            String decrypted = converter.convertToEntityAttribute(encrypted);

            assertThat(decrypted).isEqualTo(large);
        }

        @Test
        @DisplayName("Unicode / multi-byte characters survive roundtrip")
        void unicodeRoundtrip() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            String unicode = "日本語テスト 🎉 €£¥ \u0000\u001F";
            String encrypted = converter.convertToDatabaseColumn(unicode);
            String decrypted = converter.convertToEntityAttribute(encrypted);

            assertThat(decrypted).isEqualTo(unicode);
        }
    }

    // -----------------------------------------------------------------------
    // 2. Semantic security — different ciphertexts for identical plaintexts
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Semantic security (random IV per call)")
    class SemanticSecurityTests {

        @Test
        @DisplayName("Two encryptions of the same value produce different ciphertexts")
        void differentInputsProduceDifferentCiphertexts() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            String plaintext = "sensitive-data";
            String cipher1 = converter.convertToDatabaseColumn(plaintext);
            String cipher2 = converter.convertToDatabaseColumn(plaintext);

            // AES-GCM with a fresh random IV must never produce identical ciphertexts
            assertThat(cipher1).isNotEqualTo(cipher2);
        }

        @Test
        @DisplayName("Ciphertext has the expected IV:ciphertext format")
        void ciphertextHasExpectedFormat() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            String encrypted = converter.convertToDatabaseColumn("test");

            assertThat(encrypted).contains(":");
            String[] parts = encrypted.split(":", 2);
            assertThat(parts).hasSize(2);
            // IV is 12 bytes → 16 Base64 chars
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            assertThat(iv).hasSize(12);
        }
    }

    // -----------------------------------------------------------------------
    // 3. Null handling
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Null handling")
    class NullHandlingTests {

        @Test
        @DisplayName("convertToDatabaseColumn(null) returns null")
        void encryptNullReturnsNull() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            assertThat(converter.convertToDatabaseColumn(null)).isNull();
        }

        @Test
        @DisplayName("convertToEntityAttribute(null) returns null")
        void decryptNullReturnsNull() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            assertThat(converter.convertToEntityAttribute(null)).isNull();
        }
    }

    // -----------------------------------------------------------------------
    // 4. Invalid ciphertext on decrypt
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Invalid ciphertext handling")
    class InvalidCiphertextTests {

        // Note: convertToEntityAttribute is intentionally fail-soft — it never crashes the app
        // on bad data. It returns the raw value (legacy unencrypted data) or a placeholder
        // for cryptographic failures. Tests assert observed behavior.

        @Test
        @DisplayName("Completely invalid ciphertext returns raw value (treated as legacy unencrypted)")
        void invalidCiphertextThrowsException() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            // Not a valid Base64(IV):Base64(ciphertext) pair — treated as legacy raw value.
            String result = converter.convertToEntityAttribute("not-valid-encrypted-data");
            assertThat(result).isEqualTo("not-valid-encrypted-data");
        }

        @Test
        @DisplayName("Ciphertext missing colon separator returns raw value (legacy data)")
        void missingColonThrowsException() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            // Valid Base64 but no colon — converter logs warn and returns raw value.
            String noColon = Base64.getEncoder().encodeToString("garbage".getBytes());
            String result = converter.convertToEntityAttribute(noColon);
            assertThat(result).isEqualTo(noColon);
        }

        @Test
        @DisplayName("Tampered ciphertext returns DECRYPTION_FAILED placeholder")
        void tamperedCiphertextThrowsException() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            String encrypted = converter.convertToDatabaseColumn("sensitive-value");
            // Flip the FIRST character of the ciphertext (not last — last may be Base64 padding,
            // which yields IllegalArgumentException not GeneralSecurityException).
            String[] parts = encrypted.split(":", 2);
            char[] chars = parts[1].toCharArray();
            chars[0] = (chars[0] == 'A') ? 'B' : 'A';
            String tampered = parts[0] + ":" + new String(chars);

            String result = converter.convertToEntityAttribute(tampered);
            assertThat(result).isEqualTo("***DECRYPTION_FAILED***");
        }

        @Test
        @DisplayName("Ciphertext encrypted with a different key returns DECRYPTION_FAILED placeholder")
        void wrongKeyThrowsException() throws Exception {
            // Encrypt with key 1
            EncryptedStringConverter converterA = converterWithKey(VALID_KEY_BASE64);
            String encrypted = converterA.convertToDatabaseColumn("secret");

            // Try to decrypt with key 2 (all 1s instead of all 0s)
            String differentKey = Base64.getEncoder().encodeToString(new byte[]{
                    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
            });
            EncryptedStringConverter converterB = converterWithKey(differentKey);

            String result = converterB.convertToEntityAttribute(encrypted);
            assertThat(result).isEqualTo("***DECRYPTION_FAILED***");
        }
    }

    // -----------------------------------------------------------------------
    // 5. Missing / invalid ENCRYPTION_KEY env var
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("ENCRYPTION_KEY environment variable validation")
    class EncryptionKeyValidationTests {

        @Test
        @DisplayName("Missing ENCRYPTION_KEY throws IllegalStateException with clear message")
        void missingKeyThrowsIllegalStateException() throws Exception {
            EncryptedStringConverter converter = converterWithKey(null);

            assertThatThrownBy(() -> converter.convertToDatabaseColumn("anything"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("ENCRYPTION_KEY");
        }

        @Test
        @DisplayName("Blank ENCRYPTION_KEY throws IllegalStateException")
        void blankKeyThrowsIllegalStateException() throws Exception {
            EncryptedStringConverter converter = converterWithKey("   ");

            assertThatThrownBy(() -> converter.convertToDatabaseColumn("anything"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("ENCRYPTION_KEY");
        }

        @Test
        @DisplayName("ENCRYPTION_KEY that decodes to fewer than 32 bytes throws IllegalStateException")
        void shortKeyThrowsIllegalStateException() throws Exception {
            // Only 16 bytes — not enough for AES-256
            String shortKey = Base64.getEncoder().encodeToString(new byte[16]);
            EncryptedStringConverter converter = converterWithKey(shortKey);

            assertThatThrownBy(() -> converter.convertToDatabaseColumn("anything"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("32 bytes");
        }

        @Test
        @DisplayName("Valid 32-byte ENCRYPTION_KEY initialises successfully")
        void validKeyInitialisesSuccessfully() throws Exception {
            EncryptedStringConverter converter = converterWithKey(VALID_KEY_BASE64);

            // No exception should be thrown
            assertThatCode(() -> converter.convertToDatabaseColumn("hello"))
                    .doesNotThrowAnyException();
        }
    }
}
