package com.nulogic.common.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * JPA {@link AttributeConverter} that stores a {@link LocalDate} as an AES-256-GCM
 * encrypted TEXT column, delegating all cryptographic work to
 * {@link EncryptedStringConverter}.
 *
 * <h3>Why this class exists — the LocalDate / @Convert impedance mismatch</h3>
 * Hibernate natively maps {@code LocalDate → DATE} and bypasses any
 * {@code AttributeConverter} for that mapping.  Placing {@code @Convert} <em>with</em>
 * this converter overrides the native mapping entirely: Hibernate delegates reads and
 * writes to this converter and does not attempt a {@code DATE} cast.  The column
 * definition must therefore be {@code TEXT} (PostgreSQL), not {@code DATE}.
 *
 * <pre>{@code
 *   @Convert(converter = EncryptedLocalDateConverter.class)
 *   @Column(name = "date_of_birth_enc", columnDefinition = "TEXT")
 *   private LocalDate dateOfBirth;
 * }</pre>
 *
 * <h3>Storage format</h3>
 * Plaintext serialised form: ISO-8601 {@code yyyy-MM-dd} (e.g. {@code 1990-03-15}).
 * Encrypted form (standard NU-AURA envelope):
 * {@code Base64(IV-12-bytes) ":" Base64(ciphertext + GCM-tag-16-bytes)}.
 *
 * <h3>Null handling</h3>
 * A {@code null} entity value is stored as SQL {@code NULL} and read back as
 * {@code null}.
 *
 * <h3>Legacy / partial-migration compatibility</h3>
 * During the backfill window (V271 shipped, V272 drop-old-column not yet run)
 * the OLD {@code date_of_birth DATE} column may still hold a value for rows not
 * yet backfilled.  Those rows will have {@code date_of_birth_enc = NULL} until
 * the backfill pass re-saves them through this converter.  Application code must
 * treat a {@code null} return from {@link #convertToEntityAttribute(String)} as
 * "not yet migrated" and fall back to the old column via a transient bridge in
 * the entity (see {@link com.nulogic.domain.benefits.BenefitDependent}).
 *
 * @see EncryptedStringConverter
 */
@Slf4j
@Converter
public class EncryptedLocalDateConverter implements AttributeConverter<LocalDate, String> {

    private final EncryptedStringConverter stringConverter;

    /** Production constructor — uses the real environment-variable key. */
    public EncryptedLocalDateConverter() {
        this.stringConverter = new EncryptedStringConverter();
    }

    /**
     * Package-private constructor for unit tests so callers can inject a known key
     * without touching environment variables.
     *
     * @param keySupplier supplies the Base64-encoded 32-byte AES-256 key
     */
    EncryptedLocalDateConverter(java.util.function.Supplier<String> keySupplier) {
        this.stringConverter = new EncryptedStringConverter(keySupplier);
    }

    /**
     * Serialises a {@link LocalDate} to ISO-8601 then encrypts it for storage.
     *
     * @param date the entity attribute value; {@code null} is stored as SQL {@code NULL}
     * @return AES-GCM ciphertext string, or {@code null}
     */
    @Override
    public String convertToDatabaseColumn(LocalDate date) {
        if (date == null) {
            return null;
        }
        return stringConverter.convertToDatabaseColumn(date.toString());
    }

    /**
     * Decrypts the stored value and parses it back to a {@link LocalDate}.
     *
     * <p>Error handling:
     * <ul>
     *   <li>SQL {@code NULL} → {@code null} (not yet backfilled; caller handles)</li>
     *   <li>Sentinel strings from {@link EncryptedStringConverter} (e.g.
     *       {@code ***DECRYPTION_FAILED***}) → {@code null} + error log</li>
     *   <li>Non-parseable decrypted string → {@code null} + error log (data
     *       corruption; should never occur in a correctly written row)</li>
     * </ul>
     * The method never throws; it returns {@code null} for any irrecoverable error
     * to avoid crashing the entity load.
     *
     * @param dbValue the stored column value
     * @return the decrypted-and-parsed {@link LocalDate}, or {@code null}
     */
    @Override
    public LocalDate convertToEntityAttribute(String dbValue) {
        if (dbValue == null) {
            return null;
        }
        String decrypted = stringConverter.convertToEntityAttribute(dbValue);
        if (decrypted == null) {
            return null;
        }
        // Guard: EncryptedStringConverter returns a sentinel string on key/crypto failure.
        if (decrypted.startsWith("***")) {
            log.error(
                    "EncryptedLocalDateConverter: decryption returned error sentinel '{}'. " +
                    "Returning null. Verify ENCRYPTION_KEY availability and data integrity.",
                    decrypted);
            return null;
        }
        try {
            return LocalDate.parse(decrypted);
        } catch (DateTimeParseException ex) {
            log.error(
                    "EncryptedLocalDateConverter: decrypted value is not a valid ISO-8601 date. " +
                    "Returning null. This indicates data corruption or a converter bug.",
                    ex);
            return null;
        }
    }
}
