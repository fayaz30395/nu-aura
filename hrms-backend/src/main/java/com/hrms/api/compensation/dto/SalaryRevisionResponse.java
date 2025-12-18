package com.hrms.api.compensation.dto;

import com.hrms.domain.compensation.SalaryRevision;
import com.hrms.domain.compensation.SalaryRevision.RevisionStatus;
import com.hrms.domain.compensation.SalaryRevision.RevisionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryRevisionResponse {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeCode;
    private String department;

    private UUID reviewCycleId;
    private String reviewCycleName;

    private RevisionType revisionType;
    private String revisionTypeDisplayName;

    private BigDecimal previousSalary;
    private BigDecimal newSalary;
    private BigDecimal incrementAmount;
    private BigDecimal incrementPercentage;

    private String previousDesignation;
    private String newDesignation;
    private String previousLevel;
    private String newLevel;

    private LocalDate effectiveDate;
    private RevisionStatus status;
    private String statusDisplayName;

    private String justification;
    private Double performanceRating;

    private UUID proposedBy;
    private String proposedByName;
    private LocalDate proposedDate;

    private UUID reviewedBy;
    private String reviewedByName;
    private LocalDate reviewedDate;
    private String reviewerComments;

    private UUID approvedBy;
    private String approvedByName;
    private LocalDate approvedDate;
    private String approverComments;

    private String rejectionReason;
    private Boolean letterGenerated;
    private Boolean payrollProcessed;
    private String currency;

    private boolean isPromotion;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SalaryRevisionResponse fromEntity(SalaryRevision entity) {
        return SalaryRevisionResponse.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .reviewCycleId(entity.getReviewCycleId())
                .revisionType(entity.getRevisionType())
                .revisionTypeDisplayName(formatRevisionType(entity.getRevisionType()))
                .previousSalary(entity.getPreviousSalary())
                .newSalary(entity.getNewSalary())
                .incrementAmount(entity.getIncrementAmount())
                .incrementPercentage(entity.getIncrementPercentage())
                .previousDesignation(entity.getPreviousDesignation())
                .newDesignation(entity.getNewDesignation())
                .previousLevel(entity.getPreviousLevel())
                .newLevel(entity.getNewLevel())
                .effectiveDate(entity.getEffectiveDate())
                .status(entity.getStatus())
                .statusDisplayName(formatStatus(entity.getStatus()))
                .justification(entity.getJustification())
                .performanceRating(entity.getPerformanceRating())
                .proposedBy(entity.getProposedBy())
                .proposedDate(entity.getProposedDate())
                .reviewedBy(entity.getReviewedBy())
                .reviewedDate(entity.getReviewedDate())
                .reviewerComments(entity.getReviewerComments())
                .approvedBy(entity.getApprovedBy())
                .approvedDate(entity.getApprovedDate())
                .approverComments(entity.getApproverComments())
                .rejectionReason(entity.getRejectionReason())
                .letterGenerated(entity.getLetterGenerated())
                .payrollProcessed(entity.getPayrollProcessed())
                .currency(entity.getCurrency())
                .isPromotion(entity.isPromotion())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String formatRevisionType(RevisionType type) {
        if (type == null) return null;
        return switch (type) {
            case ANNUAL_INCREMENT -> "Annual Increment";
            case PROMOTION -> "Promotion";
            case ROLE_CHANGE -> "Role Change";
            case MARKET_ADJUSTMENT -> "Market Adjustment";
            case PERFORMANCE_BONUS -> "Performance Bonus";
            case SPECIAL_INCREMENT -> "Special Increment";
            case PROBATION_CONFIRMATION -> "Probation Confirmation";
            case RETENTION -> "Retention";
            case CORRECTION -> "Correction";
        };
    }

    private static String formatStatus(RevisionStatus status) {
        if (status == null) return null;
        return switch (status) {
            case DRAFT -> "Draft";
            case PENDING_REVIEW -> "Pending Review";
            case REVIEWED -> "Reviewed";
            case PENDING_APPROVAL -> "Pending Approval";
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
            case CANCELLED -> "Cancelled";
            case APPLIED -> "Applied";
        };
    }
}
