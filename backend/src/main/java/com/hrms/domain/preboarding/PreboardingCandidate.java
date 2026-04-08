package com.hrms.domain.preboarding;

import com.hrms.common.converter.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a new hire who is in pre-boarding stage (before their joining date).
 * This allows them to complete paperwork, upload documents, and view company info.
 */
@Entity
@Table(name = "preboarding_candidates", indexes = {
        @Index(name = "idx_preboard_token", columnList = "accessToken", unique = true),
        @Index(name = "idx_preboard_email", columnList = "email,tenantId"),
        @Index(name = "idx_preboard_tenant", columnList = "tenantId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreboardingCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    // Basic Info
    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(length = 100)
    private String lastName;

    @Column(nullable = false, length = 200)
    private String email;

    @Column(length = 20)
    private String phoneNumber;

    // Joining details
    @Column(nullable = false)
    private LocalDate expectedJoiningDate;

    @Column(length = 100)
    private String designation;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "reporting_manager_id")
    private UUID reportingManagerId;

    // Pre-boarding access
    @Column(nullable = false, unique = true)
    private String accessToken;

    @Column
    private LocalDateTime tokenExpiresAt;

    // Status tracking
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PreboardingStatus status = PreboardingStatus.INVITED;

    @Builder.Default
    @Column
    private Integer completionPercentage = 0;

    // Personal info (filled by candidate)
    private LocalDate dateOfBirth;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String postalCode;

    @Column(length = 100)
    private String country;

    @Column(length = 20)
    private String emergencyContactNumber;

    @Column(length = 100)
    private String emergencyContactName;

    // Bank details
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 100)
    private String bankAccountNumber;

    @Column(length = 100)
    private String bankName;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 50)
    private String bankIfscCode;

    // Tax info
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 50)
    private String taxId;

    // Documents uploaded
    @Builder.Default
    @Column
    private Boolean photoUploaded = false;

    @Builder.Default
    @Column
    private Boolean idProofUploaded = false;

    @Builder.Default
    @Column
    private Boolean addressProofUploaded = false;

    @Builder.Default
    @Column
    private Boolean educationDocsUploaded = false;

    @Builder.Default
    @Column
    private Boolean offerLetterSigned = false;

    // Link to employee after conversion
    @Column(name = "employee_id")
    private UUID employeeId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    public String getFullName() {
        if (lastName == null || lastName.isEmpty()) {
            return firstName;
        }
        return firstName + " " + lastName;
    }

    public void updateCompletionPercentage() {
        int completed = 0;
        int total = 7; // Total checkable items

        if (dateOfBirth != null) completed++;
        if (address != null && !address.isEmpty()) completed++;
        if (bankAccountNumber != null && !bankAccountNumber.isEmpty()) completed++;
        if (photoUploaded) completed++;
        if (idProofUploaded) completed++;
        if (addressProofUploaded) completed++;
        if (offerLetterSigned) completed++;

        this.completionPercentage = (completed * 100) / total;

        if (this.completionPercentage == 100 && this.status == PreboardingStatus.IN_PROGRESS) {
            this.status = PreboardingStatus.COMPLETED;
        }
    }

    public enum PreboardingStatus {
        INVITED,          // Invitation sent
        IN_PROGRESS,      // Candidate started filling
        COMPLETED,        // All pre-boarding tasks complete
        CONVERTED,        // Converted to employee
        CANCELLED         // Offer rescinded
    }
}
