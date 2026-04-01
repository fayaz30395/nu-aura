package com.hrms.api.performance.dto;

import com.hrms.domain.performance.Feedback360Summary;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Feedback360SummaryResponse {

    private UUID id;
    private UUID tenantId;
    private UUID cycleId;
    private UUID subjectEmployeeId;
    private String subjectEmployeeName;

    // Response counts
    private Integer totalReviewers;
    private Integer responsesReceived;
    private Boolean selfReviewCompleted;
    private Boolean managerReviewCompleted;
    private Integer peerReviewsCompleted;
    private Integer upwardReviewsCompleted;

    // Ratings
    private BigDecimal selfOverallRating;
    private BigDecimal managerOverallRating;
    private BigDecimal peerAvgRating;
    private BigDecimal upwardAvgRating;
    private BigDecimal finalRating;

    // Competency averages
    private BigDecimal avgCommunication;
    private BigDecimal avgTeamwork;
    private BigDecimal avgLeadership;
    private BigDecimal avgProblemSolving;
    private BigDecimal avgTechnicalSkills;
    private BigDecimal avgAdaptability;
    private BigDecimal avgWorkQuality;
    private BigDecimal avgTimeManagement;

    // Consolidated feedback
    private String consolidatedStrengths;
    private String consolidatedImprovements;
    private String actionItems;

    private LocalDateTime generatedAt;
    private Boolean sharedWithEmployee;
    private LocalDateTime sharedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static Feedback360SummaryResponse fromEntity(Feedback360Summary summary) {
        return Feedback360SummaryResponse.builder()
                .id(summary.getId())
                .tenantId(summary.getTenantId())
                .cycleId(summary.getCycleId())
                .subjectEmployeeId(summary.getSubjectEmployeeId())
                .totalReviewers(summary.getTotalReviewers())
                .responsesReceived(summary.getResponsesReceived())
                .selfReviewCompleted(summary.getSelfReviewCompleted())
                .managerReviewCompleted(summary.getManagerReviewCompleted())
                .peerReviewsCompleted(summary.getPeerReviewsCompleted())
                .upwardReviewsCompleted(summary.getUpwardReviewsCompleted())
                .selfOverallRating(summary.getSelfOverallRating())
                .managerOverallRating(summary.getManagerOverallRating())
                .peerAvgRating(summary.getPeerAverageRating())
                .upwardAvgRating(summary.getUpwardAverageRating())
                .finalRating(summary.getFinalRating())
                .avgCommunication(summary.getAvgCommunication())
                .avgTeamwork(summary.getAvgTeamwork())
                .avgLeadership(summary.getAvgLeadership())
                .avgProblemSolving(summary.getAvgProblemSolving())
                .avgTechnicalSkills(summary.getAvgTechnicalSkills())
                .avgAdaptability(summary.getAvgAdaptability())
                .avgWorkQuality(summary.getAvgWorkQuality())
                .avgTimeManagement(summary.getAvgTimeManagement())
                .consolidatedStrengths(summary.getConsolidatedStrengths())
                .consolidatedImprovements(summary.getConsolidatedImprovements())
                .actionItems(summary.getActionItems())
                .generatedAt(summary.getGeneratedAt())
                .sharedWithEmployee(summary.getSharedWithEmployee())
                .sharedAt(summary.getSharedAt())
                .createdAt(summary.getCreatedAt())
                .updatedAt(summary.getUpdatedAt())
                .build();
    }
}
