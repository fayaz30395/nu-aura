package com.hrms.api.analytics.dto;

import com.hrms.domain.analytics.SkillGap;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGapDto {

    private UUID id;
    private String skillName;
    private String skillCategory;
    private UUID departmentId;
    private String departmentName;
    private String jobFamily;

    // Current state
    private Integer currentSupply;
    private Integer requiredSupply;
    private Integer gapCount;
    private BigDecimal gapSeverity;

    // Proficiency analysis
    private BigDecimal avgProficiencyLevel;
    private BigDecimal requiredProficiencyLevel;
    private BigDecimal proficiencyGap;

    // Future projection
    private BigDecimal projectedDemandGrowth;
    private LocalDate projectionDate;
    private Integer estimatedRetirementLoss;
    private Integer estimatedAttritionLoss;
    private Integer futureGapCount;

    // Resolution strategy
    private String resolutionStrategy;
    private Boolean trainingAvailable;
    private BigDecimal estimatedTrainingCost;
    private BigDecimal estimatedHiringCost;
    private BigDecimal recommendedCost;
    private Integer timeToCloseMonths;
    private String priority;

    private LocalDate analysisDate;

    public static SkillGapDto fromEntity(SkillGap gap) {
        int futureGap = gap.getGapCount() != null ? gap.getGapCount() : 0;
        if (gap.getEstimatedRetirementLoss() != null) futureGap += gap.getEstimatedRetirementLoss();
        if (gap.getEstimatedAttritionLoss() != null) futureGap += gap.getEstimatedAttritionLoss();

        BigDecimal recommendedCost = null;
        if (gap.getResolutionStrategy() == SkillGap.ResolutionStrategy.TRAIN) {
            recommendedCost = gap.getEstimatedTrainingCost();
        } else if (gap.getResolutionStrategy() == SkillGap.ResolutionStrategy.HIRE) {
            recommendedCost = gap.getEstimatedHiringCost();
        } else if (gap.getResolutionStrategy() == SkillGap.ResolutionStrategy.HYBRID) {
            if (gap.getEstimatedTrainingCost() != null && gap.getEstimatedHiringCost() != null) {
                recommendedCost = gap.getEstimatedTrainingCost().add(gap.getEstimatedHiringCost());
            }
        }

        return SkillGapDto.builder()
                .id(gap.getId())
                .skillName(gap.getSkillName())
                .skillCategory(gap.getSkillCategory())
                .departmentId(gap.getDepartmentId())
                .departmentName(gap.getDepartmentName())
                .jobFamily(gap.getJobFamily())
                .currentSupply(gap.getCurrentSupply())
                .requiredSupply(gap.getRequiredSupply())
                .gapCount(gap.getGapCount())
                .gapSeverity(gap.getGapSeverity())
                .avgProficiencyLevel(gap.getAvgProficiencyLevel())
                .requiredProficiencyLevel(gap.getRequiredProficiencyLevel())
                .proficiencyGap(gap.getProficiencyGap())
                .projectedDemandGrowth(gap.getProjectedDemandGrowth())
                .projectionDate(gap.getProjectionDate())
                .estimatedRetirementLoss(gap.getEstimatedRetirementLoss())
                .estimatedAttritionLoss(gap.getEstimatedAttritionLoss())
                .futureGapCount(futureGap)
                .resolutionStrategy(gap.getResolutionStrategy() != null ? gap.getResolutionStrategy().name() : null)
                .trainingAvailable(gap.getTrainingAvailable())
                .estimatedTrainingCost(gap.getEstimatedTrainingCost())
                .estimatedHiringCost(gap.getEstimatedHiringCost())
                .recommendedCost(recommendedCost)
                .timeToCloseMonths(gap.getTimeToCloseMonths())
                .priority(gap.getPriority() != null ? gap.getPriority().name() : null)
                .analysisDate(gap.getAnalysisDate())
                .build();
    }
}
