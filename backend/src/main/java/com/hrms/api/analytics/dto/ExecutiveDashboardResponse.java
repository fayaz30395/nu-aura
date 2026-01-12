package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Executive Dashboard Response - C-suite level analytics
 * Provides high-level KPIs, financial metrics, and strategic insights
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecutiveDashboardResponse {

    // Key Performance Indicators
    private List<KpiCard> keyMetrics;

    // Financial Summary
    private FinancialSummary financialSummary;

    // Workforce Summary
    private WorkforceSummary workforceSummary;

    // Productivity Metrics
    private ProductivityMetrics productivityMetrics;

    // Risk Indicators
    private RiskIndicators riskIndicators;

    // Trend Charts Data
    private TrendCharts trendCharts;

    // Strategic Alerts
    private List<StrategicAlert> strategicAlerts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiCard {
        private String name;
        private String value;
        private String unit;  // %, $, #, etc.
        private String trend; // UP, DOWN, STABLE
        private BigDecimal changePercent;
        private String changeDescription;
        private String status; // GOOD, WARNING, CRITICAL
        private String icon;   // For frontend rendering
        private String color;  // Hex color for status
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinancialSummary {
        // Payroll Costs
        private BigDecimal monthlyPayrollCost;
        private BigDecimal yearToDatePayrollCost;
        private BigDecimal projectedAnnualPayrollCost;
        private BigDecimal payrollCostChangePercent;

        // Cost Per Employee
        private BigDecimal avgCostPerEmployee;
        private BigDecimal costPerEmployeeChange;

        // Budget Utilization
        private BigDecimal budgetAllocated;
        private BigDecimal budgetUtilized;
        private BigDecimal budgetUtilizationPercent;

        // Revenue Per Employee (if available)
        private BigDecimal revenuePerEmployee;

        // Department Costs
        private List<DepartmentCost> departmentCosts;

        // Cost Breakdown
        private CostBreakdown costBreakdown;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentCost {
        private UUID departmentId;
        private String departmentName;
        private BigDecimal totalCost;
        private Integer headcount;
        private BigDecimal costPerHead;
        private BigDecimal percentOfTotal;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CostBreakdown {
        private BigDecimal baseSalary;
        private BigDecimal benefits;
        private BigDecimal bonuses;
        private BigDecimal taxes;
        private BigDecimal training;
        private BigDecimal recruitment;
        private BigDecimal other;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkforceSummary {
        // Headcount
        private Integer totalHeadcount;
        private Integer activeEmployees;
        private Integer contractorCount;
        private Integer openPositions;

        // Changes
        private Integer newHiresThisMonth;
        private Integer newHiresThisQuarter;
        private Integer newHiresThisYear;
        private Integer terminationsThisMonth;
        private Integer terminationsThisQuarter;
        private Integer terminationsThisYear;

        // Rates
        private BigDecimal attritionRate;
        private BigDecimal retentionRate;
        private BigDecimal hiringVelocity; // Hires per month

        // Demographics
        private List<DemographicBreakdown> byDepartment;
        private List<DemographicBreakdown> byLocation;
        private List<DemographicBreakdown> byEmploymentType;

        // Tenure Distribution
        private TenureDistribution tenureDistribution;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemographicBreakdown {
        private String category;
        private Integer count;
        private BigDecimal percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TenureDistribution {
        private Integer lessThan1Year;
        private Integer oneToThreeYears;
        private Integer threeToFiveYears;
        private Integer fiveToTenYears;
        private Integer moreThan10Years;
        private BigDecimal avgTenureYears;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityMetrics {
        // Attendance
        private BigDecimal avgAttendanceRate;
        private BigDecimal absenteeismRate;
        private BigDecimal avgWorkingHours;

        // Performance
        private BigDecimal avgPerformanceRating;
        private Integer highPerformersCount;
        private Integer lowPerformersCount;
        private BigDecimal performanceImprovementRate;

        // Engagement
        private BigDecimal engagementScore;
        private BigDecimal engagementChangePercent;
        private BigDecimal eNPS; // Employee Net Promoter Score

        // Training
        private BigDecimal trainingHoursPerEmployee;
        private BigDecimal trainingCompletionRate;
        private Integer certificationCount;

        // Goals
        private BigDecimal goalCompletionRate;
        private Integer goalsOnTrack;
        private Integer goalsAtRisk;
        private Integer goalsDelayed;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskIndicators {
        // Attrition Risk
        private Integer highRiskEmployees;
        private Integer criticalRiskEmployees;
        private BigDecimal predictedAttritionRate;
        private List<DepartmentRisk> departmentRisks;

        // Compliance Risk
        private Integer complianceIssuesCount;
        private Integer overdueTrainings;
        private Integer expiredCertifications;

        // Skill Gaps
        private Integer criticalSkillGaps;
        private Integer totalSkillGaps;
        private BigDecimal skillCoveragePercent;

        // Succession Risk
        private Integer keyPositionsWithoutSuccessor;
        private Integer successionReadyPercentage;

        // Burnout Risk
        private Integer employeesWithHighWorkload;
        private Integer employeesWithExcessiveOvertime;
        private BigDecimal avgOvertimeHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentRisk {
        private UUID departmentId;
        private String departmentName;
        private Integer atRiskCount;
        private BigDecimal avgRiskScore;
        private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendCharts {
        // Headcount Trend (12 months)
        private List<TrendPoint> headcountTrend;

        // Payroll Cost Trend (12 months)
        private List<TrendPoint> payrollCostTrend;

        // Attrition Trend (12 months)
        private List<TrendPoint> attritionTrend;

        // Engagement Trend (12 months)
        private List<TrendPoint> engagementTrend;

        // Hiring vs Attrition (12 months)
        private List<HiringAttritionPoint> hiringVsAttrition;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String period; // e.g., "Jan 2025", "Q1 2025"
        private BigDecimal value;
        private BigDecimal previousValue;
        private BigDecimal changePercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HiringAttritionPoint {
        private String period;
        private Integer hires;
        private Integer terminations;
        private Integer netChange;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StrategicAlert {
        private String id;
        private String severity; // INFO, WARNING, CRITICAL
        private String category; // ATTRITION, COMPLIANCE, BUDGET, PERFORMANCE
        private String title;
        private String description;
        private String recommendation;
        private String impact; // HIGH, MEDIUM, LOW
        private String trend; // IMPROVING, WORSENING, STABLE
        private String createdAt;
    }
}
