package com.hrms.api.analytics.dto;

import com.hrms.domain.analytics.AttritionPrediction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttritionPredictionDto {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String department;
    private String jobTitle;
    private LocalDate predictionDate;
    private BigDecimal riskScore;
    private String riskLevel;
    private LocalDate predictedLeaveDate;
    private BigDecimal confidenceScore;

    // Risk factors
    private List<RiskFactor> riskFactors;

    // Employee features
    private Integer tenureMonths;
    private BigDecimal salaryPercentile;
    private Integer lastPromotionMonths;
    private BigDecimal engagementScore;
    private BigDecimal performanceRating;

    // Recommendations
    private List<String> recommendations;

    private Boolean actionTaken;
    private String actualOutcome;
    private LocalDate actualLeaveDate;

    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskFactor {
        private String name;
        private BigDecimal score;
        private String description;
        private String impact; // LOW, MEDIUM, HIGH
    }

    public static AttritionPredictionDto fromEntity(AttritionPrediction prediction) {
        AttritionPredictionDto.AttritionPredictionDtoBuilder builder = AttritionPredictionDto.builder()
                .id(prediction.getId())
                .employeeId(prediction.getEmployeeId())
                .predictionDate(prediction.getPredictionDate())
                .riskScore(prediction.getRiskScore())
                .riskLevel(prediction.getRiskLevel() != null ? prediction.getRiskLevel().name() : null)
                .predictedLeaveDate(prediction.getPredictedLeaveDate())
                .confidenceScore(prediction.getConfidenceScore())
                .tenureMonths(prediction.getTenureMonths())
                .salaryPercentile(prediction.getSalaryPercentile())
                .lastPromotionMonths(prediction.getLastPromotionMonths())
                .engagementScore(prediction.getEngagementScore())
                .performanceRating(prediction.getPerformanceRating())
                .actionTaken(prediction.getActionTaken())
                .actualOutcome(prediction.getActualOutcome() != null ? prediction.getActualOutcome().name() : null)
                .actualLeaveDate(prediction.getActualLeaveDate())
                .createdAt(prediction.getCreatedAt());

        // Build risk factors list
        List<RiskFactor> factors = new java.util.ArrayList<>();
        if (prediction.getTenureRisk() != null) {
            factors.add(RiskFactor.builder()
                    .name("Tenure")
                    .score(prediction.getTenureRisk())
                    .description("Risk based on tenure duration")
                    .impact(getImpactLevel(prediction.getTenureRisk()))
                    .build());
        }
        if (prediction.getCompensationRisk() != null) {
            factors.add(RiskFactor.builder()
                    .name("Compensation")
                    .score(prediction.getCompensationRisk())
                    .description("Risk based on compensation relative to market")
                    .impact(getImpactLevel(prediction.getCompensationRisk()))
                    .build());
        }
        if (prediction.getEngagementRisk() != null) {
            factors.add(RiskFactor.builder()
                    .name("Engagement")
                    .score(prediction.getEngagementRisk())
                    .description("Risk based on engagement survey scores")
                    .impact(getImpactLevel(prediction.getEngagementRisk()))
                    .build());
        }
        if (prediction.getPerformanceRisk() != null) {
            factors.add(RiskFactor.builder()
                    .name("Performance")
                    .score(prediction.getPerformanceRisk())
                    .description("Risk related to performance reviews")
                    .impact(getImpactLevel(prediction.getPerformanceRisk()))
                    .build());
        }
        if (prediction.getManagerChangeRisk() != null) {
            factors.add(RiskFactor.builder()
                    .name("Manager Change")
                    .score(prediction.getManagerChangeRisk())
                    .description("Risk from recent manager changes")
                    .impact(getImpactLevel(prediction.getManagerChangeRisk()))
                    .build());
        }
        if (prediction.getPromotionGapRisk() != null) {
            factors.add(RiskFactor.builder()
                    .name("Promotion Gap")
                    .score(prediction.getPromotionGapRisk())
                    .description("Risk from lack of promotion opportunities")
                    .impact(getImpactLevel(prediction.getPromotionGapRisk()))
                    .build());
        }
        if (prediction.getWorkloadRisk() != null) {
            factors.add(RiskFactor.builder()
                    .name("Workload")
                    .score(prediction.getWorkloadRisk())
                    .description("Risk from high workload/overtime")
                    .impact(getImpactLevel(prediction.getWorkloadRisk()))
                    .build());
        }
        builder.riskFactors(factors);

        return builder.build();
    }

    private static String getImpactLevel(BigDecimal score) {
        if (score == null) return "LOW";
        if (score.compareTo(BigDecimal.valueOf(70)) >= 0) return "HIGH";
        if (score.compareTo(BigDecimal.valueOf(40)) >= 0) return "MEDIUM";
        return "LOW";
    }
}
