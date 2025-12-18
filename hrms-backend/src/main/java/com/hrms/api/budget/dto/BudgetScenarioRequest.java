package com.hrms.api.budget.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetScenarioRequest {

    @NotNull(message = "Base budget ID is required")
    private UUID baseBudgetId;

    @NotBlank(message = "Scenario name is required")
    private String name;

    private String description;

    @NotNull(message = "Scenario type is required")
    private String scenarioType; // GROWTH, OPTIMIZATION, REDUCTION, RESTRUCTURING, WHAT_IF

    // Adjustments
    private Integer headcountAdjustment;

    private BigDecimal salaryAdjustmentPercent;

    private Boolean hiringFreeze;

    private BigDecimal attritionRateAdjustment;

    private String notes;
}
