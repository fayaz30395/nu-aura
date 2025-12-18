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
public class HiringAnalyticsResponse {

    // Pipeline Metrics
    private Integer openPositions;
    private Integer applicationsReceived;
    private Integer candidatesInPipeline;
    private Integer candidatesShortlisted;
    private Integer interviewsScheduled;
    private Integer offersExtended;
    private Integer offersAccepted;
    private Integer offersDeclined;

    // Conversion Rates
    private Double applicationToShortlistRate;
    private Double shortlistToInterviewRate;
    private Double interviewToOfferRate;
    private Double offerAcceptanceRate;
    private Double overallConversionRate;

    // Time Metrics
    private Double averageTimeToHire;
    private Double averageTimeToFill;
    private Double averageTimeInEachStage;

    // Cost Metrics
    private Double totalRecruitmentCost;
    private Double costPerHire;
    private Double costPerApplication;

    // Source Analytics
    private Map<String, Integer> applicationsBySource;
    private Map<String, Double> conversionRateBySource;
    private Map<String, Double> costPerHireBySource;
    private String topPerformingSource;

    // Department-wise Hiring
    private Map<String, Integer> openPositionsByDepartment;
    private Map<String, Integer> hiresByDepartment;
    private Map<String, Double> timeToFillByDepartment;

    // Trends
    private List<TrendDataPoint> hiringTrend;
    private List<TrendDataPoint> applicationsTrend;

    // Recruiter Performance
    private List<RecruiterMetrics> recruiterPerformance;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendDataPoint {
        private String period;
        private Integer value;
        private Double percentageChange;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecruiterMetrics {
        private String recruiterName;
        private Integer positionsHandled;
        private Integer hiresMade;
        private Double averageTimeToFill;
        private Double offerAcceptanceRate;
    }
}
