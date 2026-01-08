package com.nulogic.hrms.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecutiveDashboardData {
    private List<KpiCard> keyMetrics;
    private FinancialSummary financialSummary;
    private WorkforceSummary workforceSummary;
    private ProductivityMetrics productivityMetrics;
    private RiskIndicators riskIndicators;
    private TrendCharts trendCharts;
    private List<StrategicAlert> strategicAlerts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiCard {
        private String name;
        private String value;
        private String unit;
        private String trend; // UP, DOWN, STABLE
        private Double changePercent;
        private String changeDescription;
        private String status; // GOOD, WARNING, CRITICAL
        private String icon;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinancialSummary {
        private Double monthlyPayrollCost;
        private Double yearToDatePayrollCost;
        private Double projectedAnnualPayrollCost;
        private Double payrollCostChangePercent;
        private Double avgCostPerEmployee;
        private Double costPerEmployeeChange;
        private Double budgetAllocated;
        private Double budgetUtilized;
        private Double budgetUtilizationPercent;
        private Double revenuePerEmployee;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkforceSummary {
        private Integer totalHeadcount;
        private Integer activeEmployees;
        private Integer contractorCount;
        private Integer openPositions;
        private Integer newHiresThisMonth;
        private Integer newHiresThisQuarter;
        private Integer newHiresThisYear;
        private Integer terminationsThisMonth;
        private Integer terminationsThisQuarter;
        private Integer terminationsThisYear;
        private Double attritionRate;
        private Double retentionRate;
        private Double hiringVelocity;
        private List<DemographicBreakdown> byDepartment;
        private List<DemographicBreakdown> byLocation;
        private List<DemographicBreakdown> byEmploymentType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemographicBreakdown {
        private String category;
        private Integer count;
        private Double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityMetrics {
        private Double avgAttendanceRate;
        private Double absenteeismRate;
        private Double avgWorkingHours;
        private Double avgPerformanceRating;
        private Integer highPerformersCount;
        private Integer lowPerformersCount;
        private Double performanceImprovementRate;
        private Double engagementScore;
        private Double engagementChangePercent;
        private Integer eNPS;
        private Double trainingHoursPerEmployee;
        private Double trainingCompletionRate;
        private Integer certificationCount;
        private Double goalCompletionRate;
        private Integer goalsOnTrack;
        private Integer goalsAtRisk;
        private Integer goalsDelayed;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskIndicators {
        private Integer highRiskEmployees;
        private Integer criticalRiskEmployees;
        private Double predictedAttritionRate;
        private List<DepartmentRisk> departmentRisks;
        private Integer complianceIssuesCount;
        private Integer overdueTrainings;
        private Integer expiredCertifications;
        private Integer criticalSkillGaps;
        private Integer totalSkillGaps;
        private Double skillCoveragePercent;
        private Integer keyPositionsWithoutSuccessor;
        private Double successionReadyPercentage;
        private Integer employeesWithHighWorkload;
        private Integer employeesWithExcessiveOvertime;
        private Double avgOvertimeHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentRisk {
        private String departmentId;
        private String departmentName;
        private Integer atRiskCount;
        private Double avgRiskScore;
        private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendCharts {
        private List<TrendPoint> headcountTrend;
        private List<TrendPoint> payrollCostTrend;
        private List<TrendPoint> attritionTrend;
        private List<TrendPoint> engagementTrend;
        private List<HiringAttritionPoint> hiringVsAttrition;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String period;
        private Double value;
        private Double previousValue;
        private Double changePercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HiringAttritionPoint {
        private String period;
        private Integer hires;
        private Integer attrition;
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
