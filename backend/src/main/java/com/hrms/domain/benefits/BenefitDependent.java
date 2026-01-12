package com.hrms.domain.benefits;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dependent information for benefit enrollment.
 */
@Entity
@Table(name = "benefit_dependents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @Column(nullable = false)
    private LocalDate dateOfBirth;

    private String gender;

    // Identification
    private String nationalId;
    private String passportNumber;

    // Contact
    private String phone;
    private String email;

    // Address (if different from employee)
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

    // Health details
    private boolean hasPreExistingConditions;
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
}
