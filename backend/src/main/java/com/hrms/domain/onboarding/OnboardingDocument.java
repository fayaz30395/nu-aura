package com.hrms.domain.onboarding;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "onboarding_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OnboardingDocument extends TenantAware {


    @Column(name = "process_id", nullable = false)
    private UUID processId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "document_name", nullable = false)
    private String documentName;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private DocumentType documentType;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "mime_type")
    private String mimeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private DocumentStatus status = DocumentStatus.PENDING;

    @Column(name = "uploaded_date")
    private LocalDate uploadedDate;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_date")
    private LocalDate verifiedDate;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    public enum DocumentType {
        ID_PROOF,
        ADDRESS_PROOF,
        EDUCATION_CERTIFICATE,
        EXPERIENCE_LETTER,
        RELIEVING_LETTER,
        SALARY_SLIP,
        PAN_CARD,
        PASSPORT,
        VISA,
        BANK_DETAILS,
        OFFER_LETTER_SIGNED,
        NDA,
        EMERGENCY_CONTACT,
        MEDICAL_CERTIFICATE,
        PHOTO,
        OTHER
    }

    public enum DocumentStatus {
        PENDING,
        UPLOADED,
        VERIFIED,
        REJECTED,
        EXPIRED
    }
}
