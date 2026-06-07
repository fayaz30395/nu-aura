package com.nulogic.domain.benefits;

import com.nulogic.common.converter.EncryptedLocalDateConverter;
import com.nulogic.common.converter.EncryptedStringConverter;
import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Dependent information for benefit enrollment.
 *
 * <h3>Privacy / GDPR</h3>
 * All high-sensitivity PII fields are encrypted at rest using AES-256-GCM
 * via {@link EncryptedStringConverter}.  {@code dateOfBirth} (Article 4 GDPR,
 * additionally Article 9 when combined with health data) is stored as an
 * AES-GCM encrypted TEXT column ({@code date_of_birth_enc}) introduced in
 * Flyway V271 and mapped through {@link EncryptedLocalDateConverter}.
 *
 * <h3>How LocalDate encryption works</h3>
 * Hibernate natively maps {@code LocalDate → DATE} and bypasses any converter.
 * When {@code @Convert} is present on the field, however, Hibernate delegates
 * reads <em>and</em> writes entirely to the declared
 * {@link AttributeConverter} and skips the native type mapping.  The column
 * definition is therefore {@code TEXT}, not {@code DATE}.
 *
 * <h3>Migration window (V271 → V272)</h3>
 * The old {@code date_of_birth DATE} column is retained by V271.  Until the
 * one-time backfill (see {@code EncryptionBackfillService}) has been confirmed
 * complete, rows not yet re-saved will have {@code date_of_birth_enc = NULL}.
 * The transient field {@link #legacyDateOfBirth} maps the old column read-only
 * so the service layer can fall back to it during the migration window.  Both
 * the field and the old column must be removed in V272.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "benefit_dependents")
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BenefitDependent extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private BenefitEnrollment enrollment;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Relationship relationship;

    // -------------------------------------------------------------------------
    // dateOfBirth — P1 GDPR PII (Article 4, and Article 9 in combination with
    // health fields).  AES-256-GCM encrypted at rest via V271 migration.
    //
    // @Convert overrides Hibernate's native LocalDate → DATE mapping.
    // Column definition is TEXT to hold the IV-prefixed ciphertext.
    // The public API (getter/setter types) remain LocalDate — no callsite change.
    // -------------------------------------------------------------------------

    /**
     * Date of birth, encrypted at rest.
     *
     * <p>Written to column {@code date_of_birth_enc TEXT}.  The
     * {@link EncryptedLocalDateConverter} serialises to ISO-8601 ({@code yyyy-MM-dd})
     * before encrypting; it restores the {@link LocalDate} on load.
     *
     * <p>This field will be {@code null} for any row not yet processed by the
     * post-V271 backfill.  During that window, call {@link #effectiveDateOfBirth()}
     * which falls back to {@link #legacyDateOfBirth}.
     */
    @Convert(converter = EncryptedLocalDateConverter.class)
    @Column(name = "date_of_birth_enc", columnDefinition = "TEXT")
    private LocalDate dateOfBirth;

    /**
     * Read-only bridge to the legacy {@code date_of_birth DATE} column.
     *
     * <p>IMPORTANT: this field is INSERT-able and UPDATE-able = false so
     * Hibernate will never try to write to the old column via this mapping.
     * Writes always go through {@link #dateOfBirth} (the encrypted column).
     *
     * <p>Remove this field AND {@code date_of_birth} column in V272 after the
     * backfill is confirmed complete (100% of rows have {@code date_of_birth_enc}
     * non-null and decryptable).
     *
     * @deprecated migration-window only — remove with V272
     */
    @Deprecated(since = "V271", forRemoval = true)
    @Column(name = "date_of_birth", insertable = false, updatable = false)
    private LocalDate legacyDateOfBirth;

    /**
     * Returns the effective date of birth, preferring the encrypted column and
     * falling back to the legacy plaintext column during the migration window.
     *
     * <p>Service-layer code should call this method rather than {@link #getDateOfBirth()}
     * directly until the V272 migration has been run and all rows are confirmed
     * migrated.
     *
     * @return the dependent's date of birth, never {@code null} for a correctly
     *         stored row
     */
    public LocalDate effectiveDateOfBirth() {
        return dateOfBirth != null ? dateOfBirth : legacyDateOfBirth;
    }

    private String gender;

    // Identification (AES-GCM encrypted at rest — V147 widened columns to 512)
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 512)
    private String nationalId;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 512)
    private String passportNumber;

    // Contact (AES-GCM encrypted at rest)
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 512)
    private String phone;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 512)
    private String email;

    // Address (if different from employee) — street line encrypted; city/state/postal/country left as-is
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 2048)
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;

    // Coverage details
    private boolean isCovered;
    private LocalDate coverageStartDate;
    private LocalDate coverageEndDate;
    private String membershipId;

    // Health details — Article 9 GDPR special category. AES-GCM encrypted at rest.
    private boolean hasPreExistingConditions;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(columnDefinition = "TEXT")
    private String preExistingConditions;

    private boolean isDisabled;

    // Documents
    private String relationshipProofDocument;
    private String birthCertificateDocument;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DependentStatus status = DependentStatus.ACTIVE;

    // createdAt / updatedAt are stamped by TimeAuditingEntityListener via @TenantTimestamp —
    // see backend/docs/audit/prepersist-now-audit.md rows 23 & 24.
    @TenantTimestamp
    private LocalDateTime createdAt;

    @TenantTimestamp(updateOnChange = true)
    private LocalDateTime updatedAt;

    public int getAge() {
        LocalDate dob = effectiveDateOfBirth();
        if (dob == null) {
            throw new IllegalStateException(
                    "dateOfBirth not available (encrypted column null and legacy column null). " +
                    "Ensure the row has been saved through EncryptionBackfillService.");
        }
        return java.time.Period.between(dob, LocalDate.now()).getYears(); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public boolean isMinor() {
        return getAge() < 18;
    }

    public boolean isEligibleForCoverage() {
        // Children usually covered up to age 26
        if (relationship == Relationship.CHILD) {
            return getAge() <= 26;
        }
        return true;
    }

    public enum Relationship {
        SPOUSE,
        CHILD,
        PARENT,
        PARENT_IN_LAW,
        SIBLING,
        DOMESTIC_PARTNER,
        LEGAL_GUARDIAN,
        OTHER
    }

    public enum DependentStatus {
        PENDING_VERIFICATION,
        ACTIVE,
        INACTIVE,
        REMOVED
    }
}
