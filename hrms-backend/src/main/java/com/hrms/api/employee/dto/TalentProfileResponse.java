package com.hrms.api.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TalentProfileResponse {
    private UUID employeeId;
    private String fullName;
    private String designation;
    private String department;
    private String avatarUrl;
    private List<SkillDto> skills;
    private List<AchievementDto> achievements;
    private List<MilestoneDto> timeline;
    private List<FeedbackSnippet> recentFeedback;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillDto {
        private String name;
        private int level; // 1-5
        private String category;
        private boolean verified;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AchievementDto {
        private String title;
        private String description;
        private LocalDate date;
        private String icon;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneDto {
        private String type; // PROMOTION, PROJECT, JOINED, ANNIVERSARY
        private String title;
        private LocalDate date;
        private String status; // COMPLETED, IN_PROGRESS
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackSnippet {
        private String fromName;
        private String comment;
        private LocalDate date;
        private int rating;
    }
}
