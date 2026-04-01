package com.hrms.application.performance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerReviewRequest {

    private List<SelfAssessmentRequest.CompetencyRatingItem> competencyRatings;
    private Integer overallRating;
    private BigDecimal incrementRecommendation;
    private Boolean promotionRecommended;
    private String comments;
}
