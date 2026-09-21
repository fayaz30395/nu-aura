package com.nulogic.application.performance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    @Valid
    private List<SelfAssessmentRequest.CompetencyRatingItem> competencyRatings;
    @Min(1)
    @Max(5)
    private Integer overallRating;
    private BigDecimal incrementRecommendation;
    private Boolean promotionRecommended;
    private String comments;
}
