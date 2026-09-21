package com.nulogic.application.performance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelfAssessmentRequest {

    @Valid
    private List<CompetencyRatingItem> competencyRatings;
    private String overallComments;
    private Integer goalAchievementPercent;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompetencyRatingItem {
        private String competencyId;
        private String competencyName;
        @Min(1)
        @Max(5)
        private Integer rating;
        private String comments;
    }
}
