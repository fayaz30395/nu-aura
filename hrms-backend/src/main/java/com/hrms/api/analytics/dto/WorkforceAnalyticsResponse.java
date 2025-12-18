package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkforceAnalyticsResponse {

    private LocalDate asOfDate;

    // Headcount Metrics
    private Integer totalHeadcount;
    private Integer activeEmployees;
    private Integer onLeave;
    private Integer onProbation;
    private Integer onNoticePeriod;

    // Hiring Trends
    private Integer newJoineesThisMonth;
    private Integer newJoineesThisQuarter;
    private Integer newJoineesThisYear;
    private List<TrendDataPoint> hiringTrend;

    // Attrition Metrics
    private Integer separationsThisMonth;
    private Integer separationsThisQuarter;
    private Integer separationsThisYear;
    private Double attritionRateMonthly;
    private Double attritionRateYearly;
    private Double retentionRate;
    private List<TrendDataPoint> attritionTrend;

    // Demographics
    private GenderDistribution genderDistribution;
    private Map<String, Integer> ageDistribution;
    private Double averageAge;
    private Map<String, Integer> tenureDistribution;
    private Double averageTenure;

    // Department Distribution
    private Map<String, Integer> departmentDistribution;
    private Map<String, Double> departmentGrowth;

    // Location Distribution
    private Map<String, Integer> locationDistribution;

    // Employment Type Distribution
    private Map<String, Integer> employmentTypeDistribution;

    // Grade/Level Distribution
    private Map<String, Integer> gradeDistribution;

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
    public static class GenderDistribution {
        private Integer male;
        private Integer female;
        private Integer other;
        private Double malePercentage;
        private Double femalePercentage;
        private Double otherPercentage;
    }
}
