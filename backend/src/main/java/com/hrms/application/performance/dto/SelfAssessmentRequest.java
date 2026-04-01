package com.hrms.application.performance.dto;

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
        private Integer rating;
        private String comments;
    }
}
