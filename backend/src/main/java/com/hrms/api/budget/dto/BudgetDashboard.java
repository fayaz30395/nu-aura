package com.hrms.api.budget.dto;

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
public class BudgetDashboard {

    // Overview
    private Integer fiscalYear;
    private BigDecimal totalBudget;
    private BigDecimal allocatedBudget;
    private BigDecimal remainingBudget;
    private BigDecimal utilizationPercent;

    // Headcount
    private Integer totalPlannedHeadcount;
    private Integer currentHeadcount;
    private Integer openPositions;
    private Integer filledPositions;
    private Integer cancelledPositions;
    private BigDecimal fillRate;

    // Budget by status
    private BigDecimal draftBudget;
    private BigDecimal pendingApprovalBudget;
    private BigDecimal approvedBudget;
    private BigDecimal rejectedBudget;

    // Counts
    private Integer totalBudgets;
    private Integer draftBudgets;
    private Integer pendingBudgets;
    private Integer approvedBudgets;

    // Department breakdown
    private List<DepartmentBudgetSummary> departmentSummaries;

    // Position breakdown
    private List<PositionTypeSummary> positionTypeSummaries;

    // Scenarios
    private List<ScenarioSummary> activeScenarios;

    // Trends
    private List<MonthlyTrend> monthlyTrends;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentBudgetSummary {
        private UUID departmentId;
        private String departmentName;
        private BigDecimal totalBudget;
        private BigDecimal allocatedBudget;
        private BigDecimal utilizationPercent;
        private Integer plannedHeadcount;
        private Integer currentHeadcount;
        private Integer openPositions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PositionTypeSummary {
        private String positionType;
        private Integer count;
        private BigDecimal totalCost;
        private Integer planned;
        private Integer approved;
        private Integer filled;
        private Integer cancelled;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScenarioSummary {
        private UUID scenarioId;
        private String name;
        private String scenarioType;
        private Integer projectedHeadcount;
        private BigDecimal projectedCost;
        private BigDecimal variancePercent;
        private Boolean isSelected;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyTrend {
        private String month;
        private BigDecimal budgetSpent;
        private Integer positionsFilled;
        private Integer newHires;
        private Integer attrition;
    }
}
