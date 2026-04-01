package com.hrms.domain.tax;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tax_proofs", indexes = {
        @Index(name = "idx_tax_proof_tenant", columnList = "tenant_id"),
        @Index(name = "idx_tax_proof_declaration", columnList = "tenant_id,tax_declaration_id"),
        @Index(name = "idx_tax_proof_employee", columnList = "tenant_id,employee_id"),
        @Index(name = "idx_tax_proof_status", columnList = "tenant_id,status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaxProof {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "tax_declaration_id", nullable = false)
    private UUID taxDeclarationId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "proof_type", nullable = false, length = 100)
    @Enumerated(EnumType.STRING)
    private ProofType proofType;

    @Column(name = "investment_section", length = 50)
    @Enumerated(EnumType.STRING)
    private InvestmentSection investmentSection;

    @Column(name = "proof_description", length = 500)
    private String proofDescription;

    @Column(name = "declared_amount", precision = 15, scale = 2)
    private BigDecimal declaredAmount;

    @Column(name = "approved_amount", precision = 15, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "document_name", length = 500)
    private String documentName;

    @Column(name = "document_url", length = 1000)
    private String documentUrl;

    @Column(name = "document_type", length = 50)
    private String documentType;

    @Column(name = "document_size")
    private Long documentSize;

    @Column(name = "issuer_name", length = 255)
    private String issuerName; // Bank, Insurance Company, etc.

    @Column(name = "policy_number", length = 100)
    private String policyNumber;

    @Column(name = "certificate_number", length = 100)
    private String certificateNumber;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "status", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ProofStatus status;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    @Column(name = "rejected_by")
    private UUID rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ProofType {
        PPF_STATEMENT,
        EPF_STATEMENT,
        LIFE_INSURANCE_PREMIUM,
        ELSS_INVESTMENT,
        NSC_CERTIFICATE,
        HOME_LOAN_CERTIFICATE,
        TUITION_FEE_RECEIPT,
        SUKANYA_SAMRIDDHI_STATEMENT,
        NPS_STATEMENT,
        HEALTH_INSURANCE_PREMIUM,
        PREVENTIVE_HEALTH_CHECKUP,
        EDUCATION_LOAN_CERTIFICATE,
        DONATION_RECEIPT,
        RENT_RECEIPT,
        LANDLORD_PAN,
        FORM_16,
        INTEREST_CERTIFICATE,
        OTHER
    }

    public enum InvestmentSection {
        SEC_80C,
        SEC_80CCD_1B,
        SEC_80D,
        SEC_80E,
        SEC_80G,
        SEC_80GG,
        SEC_24,
        HRA,
        OTHER
    }

    public enum ProofStatus {
        DRAFT,          // Being uploaded
        SUBMITTED,      // Submitted for verification
        VERIFIED,       // Verified by HR
        REJECTED,       // Invalid proof
        EXPIRED         // Proof document expired
    }
}
