package com.hrms.api.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGapReport {
    private String employeeName;
    private String department;
    private List<GapDetail> gaps;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GapDetail {
        private String skillName;
        private Integer requiredLevel;
        private Integer currentLevel;
        private String gapLevel; // e.g. "CRITICAL", "MODERATE", "LOW"
        private List<SuggestedCourse> recommendedCourses;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuggestedCourse {
        private UUID courseId;
        private String title;
        private String difficulty;
    }
}
