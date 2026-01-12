package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictiveAnalyticsDashboard {

    // Attrition Risk Summary
    private AttritionSummary attritionSummary;

    // Workforce Trends
    private WorkforceSummary workforceSummary;

    // Skill Gap Summary
    private SkillGapSummary skillGapSummary;

    // Active Insights
    private List<AnalyticsInsightDto> criticalInsights;
    private Integer totalActiveInsights;
    private Integer pendingActionItems;

    // Key Metrics
    private List<KeyMetric> keyMetrics;

    // Trend Charts Data
    private List<WorkforceTrendDto> monthlyTrends;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttritionSummary {
        private Integer totalEmployees;
        private Integer lowRiskCount;
        private Integer mediumRiskCount;
        private Integer highRiskCount;
        private Integer criticalRiskCount;
        private BigDecimal avgRiskScore;
        private BigDecimal predictedAttritionRate;
        private List<AttritionPredictionDto> topAtRiskEmployees;
        private List<DepartmentRisk> departmentRisks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentRisk {
        private UUID departmentId;
        private String departmentName;
        private Integer employeeCount;
        private Integer atRiskCount;
        private BigDecimal avgRiskScore;
        private BigDecimal riskPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkforceSummary {
        private Integer currentHeadcount;
        private Integer yearToDateHires;
        private Integer yearToDateTerminations;
        private BigDecimal yearToDateAttritionRate;
        private BigDecimal avgTenureMonths;
        private BigDecimal avgEngagementScore;
        private BigDecimal avgPerformanceRating;
        private Integer openPositions;
        private BigDecimal avgTimeToFill;
        private HeadcountTrend headcountTrend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HeadcountTrend {
        private String direction; // UP, DOWN, STABLE
        private BigDecimal changePercent;
        private Integer changeCount;
        private String comparisonPeriod;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillGapSummary {
        private Integer totalGaps;
        private Integer criticalGaps;
        private Integer highPriorityGaps;
        private BigDecimal totalTrainingCostNeeded;
        private BigDecimal totalHiringCostNeeded;
        private List<SkillGapDto> topGaps;
        private List<CategoryGap> gapsByCategory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryGap {
        private String category;
        private Integer gapCount;
        private Integer skillsAffected;
        private BigDecimal avgSeverity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KeyMetric {
        private String name;
        private String value;
        private String trend; // UP, DOWN, STABLE
        private BigDecimal changePercent;
        private String status; // GOOD, WARNING, CRITICAL
        private String description;
    }
}
