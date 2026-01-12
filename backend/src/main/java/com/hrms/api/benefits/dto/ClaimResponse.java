package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitClaim;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ClaimResponse {

    private UUID id;
    private UUID enrollmentId;
    private String benefitPlanName;
    private UUID employeeId;
    private String claimNumber;
    private BenefitClaim.ClaimType claimType;
    private BenefitClaim.ClaimStatus status;

    // Claim details
    private String description;
    private LocalDate serviceDate;
    private LocalDate claimDate;

    // Medical details
    private String diagnosisCode;
    private String procedureCode;
    private String providerName;
    private String providerType;
    private String hospitalName;
    private boolean isHospitalization;
    private LocalDate admissionDate;
    private LocalDate dischargeDate;
    private int numberOfDays;

    // Claimant
    private UUID dependentId;
    private String claimantName;
    private String claimantRelationship;

    // Amounts
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
    private List<String> documentUrls;
    private String billNumber;
    private String prescriptionNumber;

    // Payment
    private BenefitClaim.PaymentMode paymentMode;
    private LocalDate paymentDate;
    private String paymentReference;

    // Processing
    private UUID processedBy;
    private LocalDateTime processedAt;
    private String processingComments;

    // Approval
    private UUID approvedBy;
    private LocalDateTime approvedAt;
    private String approvalComments;

    // Appeal
    private boolean isAppealed;
    private String appealReason;
    private LocalDate appealDate;
    private BenefitClaim.ClaimStatus appealStatus;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ClaimResponse from(BenefitClaim claim) {
        return ClaimResponse.builder()
                .id(claim.getId())
                .enrollmentId(claim.getEnrollment().getId())
                .benefitPlanName(claim.getEnrollment().getBenefitPlan().getName())
                .employeeId(claim.getEmployeeId())
                .claimNumber(claim.getClaimNumber())
                .claimType(claim.getClaimType())
                .status(claim.getStatus())
                .description(claim.getDescription())
                .serviceDate(claim.getServiceDate())
                .claimDate(claim.getClaimDate())
                .diagnosisCode(claim.getDiagnosisCode())
                .procedureCode(claim.getProcedureCode())
                .providerName(claim.getProviderName())
                .providerType(claim.getProviderType())
                .hospitalName(claim.getHospitalName())
                .isHospitalization(claim.isHospitalization())
                .admissionDate(claim.getAdmissionDate())
                .dischargeDate(claim.getDischargeDate())
                .numberOfDays(claim.getNumberOfDays())
                .dependentId(claim.getDependentId())
                .claimantName(claim.getClaimantName())
                .claimantRelationship(claim.getClaimantRelationship())
                .claimedAmount(claim.getClaimedAmount())
                .eligibleAmount(claim.getEligibleAmount())
                .approvedAmount(claim.getApprovedAmount())
                .copayAmount(claim.getCopayAmount())
                .deductibleApplied(claim.getDeductibleApplied())
                .rejectedAmount(claim.getRejectedAmount())
                .rejectionReason(claim.getRejectionReason())
                .preAuthorizationRequired(claim.isPreAuthorizationRequired())
                .preAuthorizationNumber(claim.getPreAuthorizationNumber())
                .preAuthorizationApproved(claim.isPreAuthorizationApproved())
                .documentUrls(claim.getDocumentUrls())
                .billNumber(claim.getBillNumber())
                .prescriptionNumber(claim.getPrescriptionNumber())
                .paymentMode(claim.getPaymentMode())
                .paymentDate(claim.getPaymentDate())
                .paymentReference(claim.getPaymentReference())
                .processedBy(claim.getProcessedBy())
                .processedAt(claim.getProcessedAt())
                .processingComments(claim.getProcessingComments())
                .approvedBy(claim.getApprovedBy())
                .approvedAt(claim.getApprovedAt())
                .approvalComments(claim.getApprovalComments())
                .isAppealed(claim.isAppealed())
                .appealReason(claim.getAppealReason())
                .appealDate(claim.getAppealDate())
                .appealStatus(claim.getAppealStatus())
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .build();
    }
}
