package com.hrms.api.budget.dto;

import com.hrms.domain.budget.HeadcountPosition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeadcountPositionResponse {

    private UUID id;
    private UUID budgetId;
    private String positionCode;
    private String positionTitle;
    private String positionType;
    private String status;
    private String jobLevel;
    private String jobFamily;
    private String location;
    private String employmentType;
    private BigDecimal fteCount;

    // Compensation
    private BigDecimal minSalary;
    private BigDecimal maxSalary;
    private BigDecimal budgetedSalary;
    private BigDecimal budgetedBenefits;
    private BigDecimal totalCost;

    // Timeline
    private LocalDate plannedStartDate;
    private LocalDate plannedFillDate;
    private LocalDate actualFillDate;

    // Incumbents
    private UUID currentEmployeeId;
    private String currentEmployeeName;
    private UUID replacementFor;
    private String replacementForName;

    // Requisition
    private UUID requisitionId;

    private String justification;
    private UUID hiringManagerId;
    private String hiringManagerName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static HeadcountPositionResponse fromEntity(HeadcountPosition position) {
        return HeadcountPositionResponse.builder()
                .id(position.getId())
                .budgetId(position.getBudget() != null ? position.getBudget().getId() : null)
                .positionCode(position.getPositionCode())
                .positionTitle(position.getPositionTitle())
                .positionType(position.getPositionType() != null ? position.getPositionType().name() : null)
                .status(position.getStatus() != null ? position.getStatus().name() : null)
                .jobLevel(position.getJobLevel())
                .jobFamily(position.getJobFamily())
                .location(position.getLocation())
                .employmentType(position.getEmploymentType())
                .fteCount(position.getFteCount())
                .minSalary(position.getMinSalary())
                .maxSalary(position.getMaxSalary())
                .budgetedSalary(position.getBudgetedSalary())
                .budgetedBenefits(position.getBudgetedBenefits())
                .totalCost(position.getTotalCost())
                .plannedStartDate(position.getPlannedStartDate())
                .plannedFillDate(position.getPlannedFillDate())
                .actualFillDate(position.getActualFillDate())
                .currentEmployeeId(position.getCurrentEmployeeId())
                .replacementFor(position.getReplacementFor())
                .requisitionId(position.getRequisitionId())
                .justification(position.getJustification())
                .hiringManagerId(position.getHiringManagerId())
                .createdAt(position.getCreatedAt())
                .updatedAt(position.getUpdatedAt())
                .build();
    }
}
