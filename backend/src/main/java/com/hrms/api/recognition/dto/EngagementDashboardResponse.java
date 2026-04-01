package com.hrms.api.recognition.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EngagementDashboardResponse {

    private Integer totalRecognitionsThisMonth;
    private Integer totalRecognitionsThisYear;
    private Integer activeEmployees;
    private Double recognitionRate; // % of employees who received recognition

    private Integer totalPointsAwarded;
    private Integer totalPointsRedeemed;

    private List<LeaderboardEntry> topReceivers;
    private List<LeaderboardEntry> topGivers;

    private Map<String, Integer> recognitionsByCategory;
    private Map<String, Integer> recognitionsByType;

    private Integer activeSurveys;
    private Double averageEngagementScore;
    private Double averageSatisfactionScore;

    private List<UpcomingMilestone> upcomingBirthdays;
    private List<UpcomingMilestone> upcomingAnniversaries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderboardEntry {
        private String employeeId;
        private String employeeName;
        private String avatarUrl;
        private String department;
        private Integer count;
        private Integer points;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingMilestone {
        private String employeeId;
        private String employeeName;
        private String avatarUrl;
        private String milestoneType;
        private String date;
        private Integer years; // for anniversaries
    }
}
