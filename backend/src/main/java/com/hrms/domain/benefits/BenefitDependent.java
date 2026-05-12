package com.hrms.domain.benefits;

import com.hrms.common.converter.EncryptedStringConverter;
import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Dependent information for benefit enrollment.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "benefit_dependents")
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

    // TODO(privacy): dateOfBirth is high-sensitivity PII (Article 4 GDPR). Cannot use
    // EncryptedStringConverter directly because the column is LocalDate, not String.
    // Defer to follow-up: introduce a date-mask / shadow-encrypted-string column
    // approach, or migrate column to encrypted TEXT with read/write helpers.
    @Column(nullable = false)
    private LocalDate dateOfBirth;

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

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public int getAge() {
        return java.time.Period.between(dateOfBirth, LocalDate.now()).getYears();
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
