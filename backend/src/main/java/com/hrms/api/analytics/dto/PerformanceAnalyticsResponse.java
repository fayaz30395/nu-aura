package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerformanceAnalyticsResponse {

    // Overall Metrics
    private Double averagePerformanceRating;
    private Double medianPerformanceRating;
    private Integer totalReviewsCompleted;
    private Integer pendingReviews;
    private Double reviewCompletionRate;

    // Rating Distribution
    private Map<String, Integer> ratingDistribution;
    private Map<String, Double> ratingPercentageDistribution;

    // Performance Categories
    private Integer highPerformers;
    private Integer meetingExpectations;
    private Integer needsImprovement;
    private Integer lowPerformers;
    private Double highPerformerPercentage;
    private Double lowPerformerPercentage;

    // Department-wise Performance
    private Map<String, Double> avgRatingByDepartment;
    private Map<String, Integer> highPerformersByDepartment;
    private String topPerformingDepartment;
    private String lowestPerformingDepartment;

    // Manager-wise Performance
    private Map<String, Double> avgRatingByManager;
    private List<ManagerPerformanceMetrics> managerMetrics;

    // Grade/Level-wise Performance
    private Map<String, Double> avgRatingByGrade;

    // Tenure-wise Performance
    private Map<String, Double> avgRatingByTenure;

    // Goal Achievement
    private Integer totalGoalsSet;
    private Integer goalsAchieved;
    private Integer goalsInProgress;
    private Integer goalsMissed;
    private Double goalAchievementRate;
    private Map<String, Double> goalAchievementByDepartment;

    // Trends
    private List<TrendDataPoint> performanceTrend;
    private List<TrendDataPoint> goalAchievementTrend;

    // Competency Analysis
    private Map<String, Double> avgScoreByCompetency;
    private String strongestCompetency;
    private String weakestCompetency;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendDataPoint {
        private String period;
        private Double value;
        private Double percentageChange;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ManagerPerformanceMetrics {
        private String managerName;
        private Integer teamSize;
        private Double avgTeamRating;
        private Integer highPerformers;
        private Double reviewCompletionRate;
    }
}
