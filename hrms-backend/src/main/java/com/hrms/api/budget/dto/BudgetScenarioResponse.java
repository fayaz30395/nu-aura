package com.hrms.api.budget.dto;

import com.hrms.domain.budget.BudgetScenario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetScenarioResponse {

    private UUID id;
    private UUID baseBudgetId;
    private String baseBudgetName;
    private String name;
    private String description;
    private String scenarioType;

    // Adjustments
    private Integer headcountAdjustment;
    private BigDecimal salaryAdjustmentPercent;
    private Boolean hiringFreeze;
    private BigDecimal attritionRateAdjustment;

    // Calculated impacts
    private Integer projectedHeadcount;
    private BigDecimal projectedCost;
    private BigDecimal costVariance;
    private BigDecimal variancePercent;

    private Boolean isSelected;
    private String notes;

    // Comparison with base budget
    private Integer baseHeadcount;
    private BigDecimal baseCost;
    private Integer headcountDelta;
    private BigDecimal costDelta;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BudgetScenarioResponse fromEntity(BudgetScenario scenario) {
        BudgetScenarioResponse.BudgetScenarioResponseBuilder builder = BudgetScenarioResponse.builder()
                .id(scenario.getId())
                .name(scenario.getName())
                .description(scenario.getDescription())
                .scenarioType(scenario.getScenarioType() != null ? scenario.getScenarioType().name() : null)
                .headcountAdjustment(scenario.getHeadcountAdjustment())
                .salaryAdjustmentPercent(scenario.getSalaryAdjustmentPercent())
                .hiringFreeze(scenario.getHiringFreeze())
                .attritionRateAdjustment(scenario.getAttritionRateAdjustment())
                .projectedHeadcount(scenario.getProjectedHeadcount())
                .projectedCost(scenario.getProjectedCost())
                .costVariance(scenario.getCostVariance())
                .variancePercent(scenario.getVariancePercent())
                .isSelected(scenario.getIsSelected())
                .notes(scenario.getNotes())
                .createdAt(scenario.getCreatedAt())
                .updatedAt(scenario.getUpdatedAt());

        if (scenario.getBaseBudget() != null) {
            builder.baseBudgetId(scenario.getBaseBudget().getId())
                    .baseBudgetName(scenario.getBaseBudget().getBudgetName())
                    .baseHeadcount(scenario.getBaseBudget().getClosingHeadcount())
                    .baseCost(scenario.getBaseBudget().getTotalBudget());

            if (scenario.getProjectedHeadcount() != null && scenario.getBaseBudget().getClosingHeadcount() != null) {
                builder.headcountDelta(scenario.getProjectedHeadcount() - scenario.getBaseBudget().getClosingHeadcount());
            }

            if (scenario.getProjectedCost() != null && scenario.getBaseBudget().getTotalBudget() != null) {
                builder.costDelta(scenario.getProjectedCost().subtract(scenario.getBaseBudget().getTotalBudget()));
            }
        }

        return builder.build();
    }
}
