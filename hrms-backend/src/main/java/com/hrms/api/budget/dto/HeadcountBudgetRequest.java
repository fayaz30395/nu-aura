package com.hrms.api.budget.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class HeadcountBudgetRequest {

    @NotBlank(message = "Budget name is required")
    private String name;

    private String description;

    @NotNull(message = "Fiscal year is required")
    private Integer fiscalYear;

    private String quarter; // Q1, Q2, Q3, Q4, or null for annual

    @NotNull(message = "Department ID is required")
    private UUID departmentId;

    private String departmentName;

    private UUID costCenterId;

    private String costCenterCode;

    @NotNull(message = "Total budget is required")
    @Positive(message = "Total budget must be positive")
    private BigDecimal totalBudget;

    private BigDecimal salaryBudget;

    private BigDecimal benefitsBudget;

    private BigDecimal contingencyBudget;

    @NotNull(message = "Opening headcount is required")
    private Integer openingHeadcount;

    private Integer plannedHires;

    private Integer plannedAttrition;

    private BigDecimal attritionRate;

    private String currency;

    private String notes;
}
