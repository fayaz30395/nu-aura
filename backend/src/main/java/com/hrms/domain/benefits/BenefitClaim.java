package com.hrms.domain.benefits;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Benefit claims for insurance reimbursement and wellness expenses.
 */
@Entity
@Table(name = "benefit_claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BenefitClaim extends TenantAware {

    // id field is inherited from BaseEntity

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private BenefitEnrollment enrollment;

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false, unique = true)
    private String claimNumber;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ClaimType claimType;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ClaimStatus status;

    // Claim details
    private String description;
    private LocalDate serviceDate;
    private LocalDate claimDate;

    // For medical claims
    private String diagnosisCode;
    private String procedureCode;
    private String providerName;
    private String providerType;
    private String hospitalName;
    private boolean isHospitalization;
    private LocalDate admissionDate;
    private LocalDate dischargeDate;
    private int numberOfDays;

    // For dependent claims
    private UUID dependentId;
    private String claimantName;
    private String claimantRelationship;

    // Amount details
    @Column(nullable = false)
    private BigDecimal claimedAmount;
    private BigDecimal eligibleAmount;
    private BigDecimal approvedAmount;
    private BigDecimal copayAmount;
    private BigDecimal deductibleApplied;
    private BigDecimal rejectedAmount;
    private String rejectionReason;

    // Pre-authorization
    private boolean preAuthorizationRequired;
    private String preAuthorizationNumber;
    private boolean preAuthorizationApproved;

    // Documents
    @ElementCollection
    @CollectionTable(name = "benefit_claim_documents", joinColumns = @JoinColumn(name = "claim_id"))
    @Column(name = "document_url")
    @Builder.Default
    private List<String> documentUrls = new ArrayList<>();

    private String billNumber;
    private String prescriptionNumber;

    // Payment details
    @Enumerated(EnumType.STRING)
    private PaymentMode paymentMode;
    private String bankAccountNumber;
    private String ifscCode;
    private String upiId;
    private LocalDate paymentDate;
    private String paymentReference;

    // Processing details
    private UUID processedBy;
    private LocalDateTime processedAt;
    private String processingComments;

    // Approval workflow
    private UUID approvedBy;
    private LocalDateTime approvedAt;
    private String approvalComments;

    // Appeal (if rejected)
    private boolean isAppealed;
    private String appealReason;
    private LocalDate appealDate;
    @Enumerated(EnumType.STRING)
    private ClaimStatus appealStatus;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    public enum ClaimType {
        // Health insurance
        HOSPITALIZATION,
        OUTPATIENT,
        PHARMACY,
        LAB_TEST,
        CONSULTATION,
        MATERNITY,
        DENTAL,
        VISION,
        MENTAL_HEALTH,
        PREVENTIVE_CARE,
        EMERGENCY,

        // Wellness
        GYM_MEMBERSHIP,
        FITNESS_EQUIPMENT,
        WELLNESS_PROGRAM,
        HEALTH_CHECKUP,
        VACCINATION,

        // Flexible spending
        CHILDCARE,
        ELDER_CARE,
        TRANSPORTATION,
        EDUCATION,

        // Others
        ACCIDENT,
        CRITICAL_ILLNESS,
        LIFE_INSURANCE,
        OTHER
    }

    public enum ClaimStatus {
        DRAFT,
        SUBMITTED,
        DOCUMENTS_PENDING,
        UNDER_REVIEW,
        ADDITIONAL_INFO_REQUIRED,
        PRE_AUTH_PENDING,
        PRE_AUTH_APPROVED,
        PRE_AUTH_REJECTED,
        APPROVED,
        PARTIALLY_APPROVED,
        REJECTED,
        PAYMENT_INITIATED,
        PAYMENT_COMPLETED,
        CLOSED,
        APPEALED,
        APPEAL_APPROVED,
        APPEAL_REJECTED
    }

    public enum PaymentMode {
        BANK_TRANSFER,
        CHECK,
        PAYROLL_CREDIT,
        UPI,
        DIRECT_SETTLEMENT
    }

    @PrePersist
    protected void onCreate() {
        if (claimDate == null) claimDate = LocalDate.now();
        if (status == null) status = ClaimStatus.DRAFT;
        if (claimNumber == null) {
            claimNumber = "CLM-" + System.currentTimeMillis();
        }
    }

    public void submit() {
        this.status = ClaimStatus.SUBMITTED;
    }

    public void approve(BigDecimal amount, UUID approver, String comments) {
        this.approvedAmount = amount;
        this.approvedBy = approver;
        this.approvedAt = LocalDateTime.now();
        this.approvalComments = comments;
        this.status = amount.compareTo(claimedAmount) < 0 ?
            ClaimStatus.PARTIALLY_APPROVED : ClaimStatus.APPROVED;
    }

    public void reject(String reason, UUID processor) {
        this.status = ClaimStatus.REJECTED;
        this.rejectionReason = reason;
        this.processedBy = processor;
        this.processedAt = LocalDateTime.now();
    }

    public void initiatePayment() {
        this.status = ClaimStatus.PAYMENT_INITIATED;
    }

    public void completePayment(String reference) {
        this.status = ClaimStatus.PAYMENT_COMPLETED;
        this.paymentReference = reference;
        this.paymentDate = LocalDate.now();
    }
}
