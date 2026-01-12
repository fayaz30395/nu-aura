package com.hrms.api.compensation.dto;

import com.hrms.domain.compensation.CompensationReviewCycle;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleStatus;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleType;
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
public class CompensationCycleResponse {

    private UUID id;
    private String name;
    private String description;

    private CycleType cycleType;
    private String cycleTypeDisplayName;

    private Integer fiscalYear;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate effectiveDate;

    private CycleStatus status;
    private String statusDisplayName;

    private BigDecimal budgetAmount;
    private BigDecimal utilizedAmount;
    private BigDecimal remainingBudget;
    private Double budgetUtilizationPercentage;

    private BigDecimal minIncrementPercentage;
    private BigDecimal maxIncrementPercentage;
    private BigDecimal averageIncrementTarget;
    private Double actualAverageIncrement;

    private Boolean includeAllEmployees;
    private Integer minTenureMonths;
    private Boolean excludeProbationers;
    private Boolean excludeNoticePeriod;
    private Boolean allowPromotions;
    private Boolean requirePerformanceRating;
    private Double minPerformanceRating;

    private UUID createdBy;
    private String createdByName;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDate approvalDate;

    private Integer totalEmployees;
    private Integer revisionsDrafted;
    private Integer revisionsApproved;
    private Integer revisionsApplied;
    private Integer promotionsCount;

    private String currency;
    private boolean isActive;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CompensationCycleResponse fromEntity(CompensationReviewCycle entity) {
        return CompensationCycleResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .cycleType(entity.getCycleType())
                .cycleTypeDisplayName(formatCycleType(entity.getCycleType()))
                .fiscalYear(entity.getFiscalYear())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .effectiveDate(entity.getEffectiveDate())
                .status(entity.getStatus())
                .statusDisplayName(formatStatus(entity.getStatus()))
                .budgetAmount(entity.getBudgetAmount())
                .utilizedAmount(entity.getUtilizedAmount())
                .remainingBudget(entity.getRemainingBudget())
                .budgetUtilizationPercentage(entity.getBudgetUtilizationPercentage())
                .minIncrementPercentage(entity.getMinIncrementPercentage())
                .maxIncrementPercentage(entity.getMaxIncrementPercentage())
                .averageIncrementTarget(entity.getAverageIncrementTarget())
                .includeAllEmployees(entity.getIncludeAllEmployees())
                .minTenureMonths(entity.getMinTenureMonths())
                .excludeProbationers(entity.getExcludeProbationers())
                .excludeNoticePeriod(entity.getExcludeNoticePeriod())
                .allowPromotions(entity.getAllowPromotions())
                .requirePerformanceRating(entity.getRequirePerformanceRating())
                .minPerformanceRating(entity.getMinPerformanceRating())
                .createdBy(entity.getCreatedBy())
                .approvedBy(entity.getApprovedBy())
                .approvalDate(entity.getApprovalDate())
                .totalEmployees(entity.getTotalEmployees())
                .revisionsDrafted(entity.getRevisionsDrafted())
                .revisionsApproved(entity.getRevisionsApproved())
                .revisionsApplied(entity.getRevisionsApplied())
                .currency(entity.getCurrency())
                .isActive(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String formatCycleType(CycleType type) {
        if (type == null) return null;
        return switch (type) {
            case ANNUAL -> "Annual Review";
            case MID_YEAR -> "Mid-Year Review";
            case QUARTERLY -> "Quarterly Review";
            case SPECIAL -> "Special Review";
            case AD_HOC -> "Ad-hoc Review";
        };
    }

    private static String formatStatus(CycleStatus status) {
        if (status == null) return null;
        return switch (status) {
            case DRAFT -> "Draft";
            case PLANNING -> "Planning";
            case IN_PROGRESS -> "In Progress";
            case REVIEW -> "Under Review";
            case APPROVAL -> "Pending Approval";
            case APPROVED -> "Approved";
            case COMPLETED -> "Completed";
            case CANCELLED -> "Cancelled";
        };
    }
}
