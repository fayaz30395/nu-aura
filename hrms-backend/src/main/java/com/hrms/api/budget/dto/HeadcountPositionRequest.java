package com.hrms.api.budget.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeadcountPositionRequest {

    @NotNull(message = "Budget ID is required")
    private UUID budgetId;

    private String positionCode;

    @NotBlank(message = "Position title is required")
    private String positionTitle;

    @NotNull(message = "Position type is required")
    private String positionType; // NEW_ROLE, REPLACEMENT, CONVERSION, UPGRADE, BACKFILL

    private String jobLevel;

    private String jobFamily;

    private String location;

    private String employmentType; // FULL_TIME, PART_TIME, CONTRACT

    private BigDecimal fteCount;

    private BigDecimal minSalary;

    private BigDecimal maxSalary;

    @NotNull(message = "Budgeted salary is required")
    private BigDecimal budgetedSalary;

    private BigDecimal budgetedBenefits;

    private LocalDate plannedStartDate;

    private LocalDate plannedFillDate;

    private UUID replacementFor;

    private String justification;

    private UUID hiringManagerId;
}
