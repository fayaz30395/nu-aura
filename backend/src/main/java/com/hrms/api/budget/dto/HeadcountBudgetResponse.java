package com.hrms.api.budget.dto;

import com.hrms.domain.budget.HeadcountBudget;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeadcountBudgetResponse {

    private UUID id;
    private String name;
    private String description;
    private Integer fiscalYear;
    private String quarter;
    private UUID departmentId;
    private String departmentName;
    private UUID costCenterId;
    private String costCenterCode;

    // Budget amounts
    private BigDecimal totalBudget;
    private BigDecimal salaryBudget;
    private BigDecimal benefitsBudget;
    private BigDecimal contingencyBudget;
    private BigDecimal allocatedBudget;
    private BigDecimal remainingBudget;
    private BigDecimal utilizationPercent;

    // Headcount
    private Integer openingHeadcount;
    private Integer plannedHires;
    private Integer plannedAttrition;
    private Integer closingHeadcount;
    private Integer currentHeadcount;
    private BigDecimal attritionRate;

    // Status
    private String status;
    private String currency;
    private String notes;

    // Approval
    private UUID approvedBy;
    private LocalDateTime approvedAt;

    // Positions
    private List<HeadcountPositionResponse> positions;

    // Scenarios
    private List<BudgetScenarioResponse> scenarios;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static HeadcountBudgetResponse fromEntity(HeadcountBudget budget) {
        BigDecimal totalBudget = budget.getTotalBudget() != null ? budget.getTotalBudget() : BigDecimal.ZERO;
        BigDecimal actualSpend = budget.getActualTotalSpend() != null ? budget.getActualTotalSpend() : BigDecimal.ZERO;
        BigDecimal remaining = totalBudget.subtract(actualSpend);

        BigDecimal utilization = BigDecimal.ZERO;
        if (totalBudget.compareTo(BigDecimal.ZERO) > 0) {
            utilization = actualSpend
                    .divide(totalBudget, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        return HeadcountBudgetResponse.builder()
                .id(budget.getId())
                .name(budget.getBudgetName())
                .fiscalYear(budget.getFiscalYear())
                .quarter(budget.getQuarter() != null ? budget.getQuarter().name() : null)
                .departmentId(budget.getDepartmentId())
                .costCenterCode(budget.getCostCenter())
                .totalBudget(totalBudget)
                .salaryBudget(budget.getSalaryBudget())
                .benefitsBudget(budget.getBenefitsBudget())
                .allocatedBudget(actualSpend)
                .remainingBudget(remaining)
                .utilizationPercent(utilization)
                .openingHeadcount(budget.getOpeningHeadcount())
                .plannedHires(budget.getPlannedHires())
                .plannedAttrition(budget.getPlannedAttrition())
                .closingHeadcount(budget.getClosingHeadcount())
                .currentHeadcount(budget.getActualHeadcount())
                .status(budget.getStatus() != null ? budget.getStatus().name() : null)
                .notes(budget.getApprovalNotes())
                .approvedBy(budget.getApprovedBy())
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .build();
    }
}
