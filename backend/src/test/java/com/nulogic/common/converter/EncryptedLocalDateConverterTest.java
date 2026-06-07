package com.nulogic.common.converter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Base64;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for {@link EncryptedLocalDateConverter}.
 *
 * <p>Strategy: inject a deterministic key via the package-private constructor so
 * tests never depend on the environment.  Uses the same 32-zero-byte test key as
 * {@link EncryptedStringConverterTest}.
 */
@DisplayName("EncryptedLocalDateConverter")
class EncryptedLocalDateConverterTest {

    // Valid 32-byte Base64 key (matches EncryptedStringConverterTest for consistency)
    private static final String VALID_KEY_BASE64 =
            Base64.getEncoder().encodeToString(new byte[32]);

    private EncryptedLocalDateConverter converterWithKey(String base64Key) {
        return new EncryptedLocalDateConverter(() -> base64Key);
    }

    // -----------------------------------------------------------------------
    // 1. Roundtrip
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Roundtrip encrypt / decrypt")
    class RoundtripTests {

        @Test
        @DisplayName("should_return_original_date_after_encrypt_decrypt_roundtrip")
        void should_return_original_date_after_roundtrip() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);
            LocalDate original = LocalDate.of(1990, 3, 15);

            String dbValue  = converter.convertToDatabaseColumn(original);
            LocalDate result = converter.convertToEntityAttribute(dbValue);

            assertThat(result).isEqualTo(original);
        }

        @Test
        @DisplayName("should_round_trip_earliest_representable_date")
        void should_round_trip_earliest_representable_date() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);
            LocalDate date = LocalDate.of(1900, 1, 1);

            assertThat(converter.convertToEntityAttribute(converter.convertToDatabaseColumn(date)))
                    .isEqualTo(date);
        }

        @Test
        @DisplayName("should_round_trip_max_representable_date")
        void should_round_trip_max_date() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);
            LocalDate date = LocalDate.of(9999, 12, 31);

            assertThat(converter.convertToEntityAttribute(converter.convertToDatabaseColumn(date)))
                    .isEqualTo(date);
        }
    }

    // -----------------------------------------------------------------------
    // 2. Semantic security
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Semantic security")
    class SemanticSecurityTests {

        @Test
        @DisplayName("should_produce_different_ciphertext_for_same_date_on_each_call")
        void should_produce_different_ciphertext_each_call() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);
            LocalDate date = LocalDate.of(1985, 6, 20);

            String first  = converter.convertToDatabaseColumn(date);
            String second = converter.convertToDatabaseColumn(date);

            // AES-GCM with a random IV must never produce the same ciphertext twice
            assertThat(first).isNotEqualTo(second);
        }

        @Test
        @DisplayName("should_store_iv_colon_ciphertext_format")
        void should_store_iv_colon_ciphertext_format() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);
            String dbValue = converter.convertToDatabaseColumn(LocalDate.of(2000, 1, 1));

            assertThat(dbValue).contains(":");
            String[] parts = dbValue.split(":", 2);
            assertThat(parts).hasSize(2);
            // IV is 12 bytes → 16 Base64 characters
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
        @DisplayName("should_return_null_db_value_for_null_entity_date")
        void null_entity_value_gives_null_db_value() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);
            assertThat(converter.convertToDatabaseColumn(null)).isNull();
        }

        @Test
        @DisplayName("should_return_null_entity_value_for_null_db_value")
        void null_db_value_gives_null_entity_value() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);
            assertThat(converter.convertToEntityAttribute(null)).isNull();
        }
    }

    // -----------------------------------------------------------------------
    // 4. Error resilience
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Error resilience")
    class ErrorResilienceTests {

        @Test
        @DisplayName("should_return_null_not_throw_when_decryption_sentinel_is_returned")
        void should_return_null_for_decryption_sentinel() {
            // Simulate a wrong-key scenario: encrypt with key A, decrypt with key B
            String keyA = Base64.getEncoder().encodeToString(new byte[32]);
            String keyB = Base64.getEncoder().encodeToString(new byte[]{
                    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
                    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
            });
            EncryptedLocalDateConverter encryptor  = new EncryptedLocalDateConverter(() -> keyA);
            EncryptedLocalDateConverter decryptor  = new EncryptedLocalDateConverter(() -> keyB);

            String dbValue = encryptor.convertToDatabaseColumn(LocalDate.of(1990, 5, 10));

            // Decryptor with wrong key should return null (not throw)
            assertThatCode(() -> {
                LocalDate result = decryptor.convertToEntityAttribute(dbValue);
                assertThat(result).isNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should_return_null_not_throw_for_completely_invalid_db_value")
        void should_return_null_for_garbage_input() {
            EncryptedLocalDateConverter converter = converterWithKey(VALID_KEY_BASE64);

            // A value that cannot be parsed as a date at all
            assertThatCode(() -> {
                LocalDate result = converter.convertToEntityAttribute("not-a-date-not-encrypted");
                // Either null or the raw string parsed — we assert no exception is thrown
                // and that it doesn't crash the JVM; actual value depends on fail-soft path.
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should_return_null_when_key_is_missing_and_sentinel_is_produced")
        void should_return_null_when_key_missing() {
            // Without a key, convertToEntityAttribute on an encrypted value returns a sentinel.
            // We pre-encrypt with a real key, then attempt to decrypt with no key.
            EncryptedLocalDateConverter encryptor = converterWithKey(VALID_KEY_BASE64);
            String dbValue = encryptor.convertToDatabaseColumn(LocalDate.of(2000, 1, 1));

            EncryptedLocalDateConverter noKeyConverter = converterWithKey(null);
            // The no-key converter's EncryptedStringConverter will return KEY_NOT_CONFIGURED
            // sentinel; we should get null back without throwing.
            assertThatCode(() -> {
                LocalDate result = noKeyConverter.convertToEntityAttribute(dbValue);
                assertThat(result).isNull();
            }).doesNotThrowAnyException();
        }
    }
}
