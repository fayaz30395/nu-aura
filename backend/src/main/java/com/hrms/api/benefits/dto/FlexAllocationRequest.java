package com.hrms.api.benefits.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class FlexAllocationRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "Fiscal year is required")
    private Integer fiscalYear;

    @NotNull(message = "Total credits is required")
    @Positive(message = "Total credits must be positive")
    private BigDecimal totalCredits;

    // Category-wise allocation limits
    private BigDecimal healthAllocation;
    private BigDecimal wellnessAllocation;
    private BigDecimal lifestyleAllocation;
    private BigDecimal retirementAllocation;
    private BigDecimal educationAllocation;
    private BigDecimal transportAllocation;

    // Dates
    private LocalDate allocationDate;
    private LocalDate expiryDate;

    // Carryover
    private BigDecimal carryoverAmount;
    private Integer carryoverFromYear;
}
