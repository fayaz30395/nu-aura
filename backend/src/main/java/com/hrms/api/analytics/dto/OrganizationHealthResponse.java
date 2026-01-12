package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationHealthResponse {
    private OverallHealth healthScore;
    private TurnoverMetrics turnover;
    private DiversityMetrics diversity;
    private TenureMetrics tenure;
    private EngagementMetrics engagement;
    private TrainingMetrics training;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverallHealth {
        private int score; // 0-100
        private String status; // CRITICAL, WARNING, GOOD, EXCELLENT
        private double trend; // % change vs last period
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TurnoverMetrics {
        private double annualTurnoverRate;
        private int monthlyExits;
        private int monthlyJoiners;
        private List<DataPoint> trend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiversityMetrics {
        private Map<String, Long> genderDistribution;
        private Map<String, Long> departmentDistribution;
        private double genderParityIndex;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TenureMetrics {
        private double averageTenureYears;
        private Map<String, Long> tenureDistribution; // e.g., "0-1yr", "1-3yr", etc.
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EngagementMetrics {
        private double overallEngagementScore;
        private double participationRate;
        private List<DataPoint> engagementTrend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrainingMetrics {
        private double completionRate;
        private int totalTrainingHours;
        private int activeLearners;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataPoint {
        private String label;
        private double value;
    }
}
