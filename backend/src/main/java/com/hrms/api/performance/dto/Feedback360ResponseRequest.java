package com.hrms.api.performance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Feedback360ResponseRequest {

    private UUID requestId;
    private Boolean isDraft;

    // Ratings (1-5 scale)
    private BigDecimal overallRating;
    private BigDecimal communicationRating;
    private BigDecimal teamworkRating;
    private BigDecimal leadershipRating;
    private BigDecimal problemSolvingRating;
    private BigDecimal technicalSkillsRating;
    private BigDecimal adaptabilityRating;
    private BigDecimal workQualityRating;
    private BigDecimal timeManagementRating;

    // Qualitative feedback
    private String strengths;
    private String areasForImprovement;
    private String additionalComments;
    private String specificExamples;
    private String developmentSuggestions;

    // Custom responses (JSON)
    private String customResponses;
}
