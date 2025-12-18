package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompensationAnalyticsResponse {

    // Overall Compensation Metrics
    private BigDecimal totalPayrollCost;
    private BigDecimal monthlyPayrollCost;
    private BigDecimal averageSalary;
    private BigDecimal medianSalary;
    private BigDecimal minSalary;
    private BigDecimal maxSalary;

    // Salary Distribution
    private Map<String, Integer> salaryBandDistribution;
    private Map<String, Double> salaryBandPercentage;

    // Department-wise Compensation
    private Map<String, BigDecimal> avgSalaryByDepartment;
    private Map<String, BigDecimal> totalCostByDepartment;
    private String highestPayingDepartment;
    private String lowestPayingDepartment;

    // Grade/Level-wise Compensation
    private Map<String, BigDecimal> avgSalaryByGrade;
    private Map<String, SalaryRange> salaryRangeByGrade;

    // Gender Pay Analysis
    private BigDecimal avgMaleSalary;
    private BigDecimal avgFemaleSalary;
    private Double genderPayGap;
    private Map<String, Double> genderPayGapByGrade;

    // Tenure-wise Compensation
    private Map<String, BigDecimal> avgSalaryByTenure;

    // Increment Analysis
    private Double avgIncrementPercentage;
    private Integer employeesWithIncrement;
    private Integer promotions;
    private BigDecimal totalIncrementCost;
    private Map<String, Double> avgIncrementByDepartment;
    private Map<String, Double> avgIncrementByPerformance;

    // Budget Analysis
    private BigDecimal budgetAllocated;
    private BigDecimal budgetUtilized;
    private Double budgetUtilizationPercentage;
    private BigDecimal remainingBudget;

    // Benefits Cost
    private BigDecimal totalBenefitsCost;
    private Map<String, BigDecimal> costByBenefitType;
    private Double benefitsCostPercentage;

    // Trends
    private List<TrendDataPoint> payrollTrend;
    private List<TrendDataPoint> avgSalaryTrend;
    private List<TrendDataPoint> headcountVsPayrollTrend;

    // Compa-Ratio Analysis
    private Double avgCompaRatio;
    private Map<String, Double> compaRatioByDepartment;
    private Integer belowRangeCount;
    private Integer atMarketCount;
    private Integer aboveRangeCount;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendDataPoint {
        private String period;
        private BigDecimal value;
        private Double percentageChange;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SalaryRange {
        private BigDecimal min;
        private BigDecimal max;
        private BigDecimal midpoint;
    }
}
