package com.hrms.api.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseCatalogResponse {
    private List<CourseSummaryDto> courses;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseSummaryDto {
        private UUID id;
        private String title;
        private String code;
        private String shortDescription;
        private String thumbnailUrl;
        private String difficultyLevel;
        private BigDecimal durationHours;
        private List<String> skillsCovered;
        private boolean isMandatory;
        private Integer totalEnrollments;
        private BigDecimal avgRating;
    }
}
