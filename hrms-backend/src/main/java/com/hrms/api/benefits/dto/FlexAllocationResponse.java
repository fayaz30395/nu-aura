package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.FlexBenefitAllocation;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class FlexAllocationResponse {

    private UUID id;
    private UUID employeeId;
    private int fiscalYear;

    // Total allocation
    private BigDecimal totalCredits;
    private BigDecimal usedCredits;
    private BigDecimal remainingCredits;
    private BigDecimal forfeitedCredits;

    // Category-wise
    private BigDecimal healthAllocation;
    private BigDecimal healthUsed;
    private BigDecimal healthRemaining;
    private BigDecimal wellnessAllocation;
    private BigDecimal wellnessUsed;
    private BigDecimal wellnessRemaining;
    private BigDecimal lifestyleAllocation;
    private BigDecimal lifestyleUsed;
    private BigDecimal lifestyleRemaining;
    private BigDecimal retirementAllocation;
    private BigDecimal retirementUsed;
    private BigDecimal retirementRemaining;
    private BigDecimal educationAllocation;
    private BigDecimal educationUsed;
    private BigDecimal educationRemaining;
    private BigDecimal transportAllocation;
    private BigDecimal transportUsed;
    private BigDecimal transportRemaining;

    // Dates
    private LocalDate allocationDate;
    private LocalDate expiryDate;
    private int daysUntilExpiry;

    // Carryover
    private BigDecimal carryoverAmount;
    private int carryoverFromYear;

    // Status
    private FlexBenefitAllocation.AllocationStatus status;
    private double utilizationPercentage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FlexAllocationResponse from(FlexBenefitAllocation allocation) {
        BigDecimal remaining = allocation.getRemainingCredits() != null ? allocation.getRemainingCredits() : BigDecimal.ZERO;
        BigDecimal total = allocation.getTotalCredits() != null ? allocation.getTotalCredits() : BigDecimal.ONE;
        BigDecimal used = allocation.getUsedCredits() != null ? allocation.getUsedCredits() : BigDecimal.ZERO;

        double utilization = total.compareTo(BigDecimal.ZERO) > 0 ?
                used.multiply(BigDecimal.valueOf(100)).divide(total, 2, java.math.RoundingMode.HALF_UP).doubleValue() : 0;

        int daysUntilExpiry = 0;
        if (allocation.getExpiryDate() != null) {
            daysUntilExpiry = (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), allocation.getExpiryDate());
        }

        return FlexAllocationResponse.builder()
                .id(allocation.getId())
                .employeeId(allocation.getEmployeeId())
                .fiscalYear(allocation.getFiscalYear())
                .totalCredits(allocation.getTotalCredits())
                .usedCredits(allocation.getUsedCredits())
                .remainingCredits(allocation.getRemainingCredits())
                .forfeitedCredits(allocation.getForfeitedCredits())
                .healthAllocation(allocation.getHealthAllocation())
                .healthUsed(allocation.getHealthUsed())
                .healthRemaining(calculateRemaining(allocation.getHealthAllocation(), allocation.getHealthUsed()))
                .wellnessAllocation(allocation.getWellnessAllocation())
                .wellnessUsed(allocation.getWellnessUsed())
                .wellnessRemaining(calculateRemaining(allocation.getWellnessAllocation(), allocation.getWellnessUsed()))
                .lifestyleAllocation(allocation.getLifestyleAllocation())
                .lifestyleUsed(allocation.getLifestyleUsed())
                .lifestyleRemaining(calculateRemaining(allocation.getLifestyleAllocation(), allocation.getLifestyleUsed()))
                .retirementAllocation(allocation.getRetirementAllocation())
                .retirementUsed(allocation.getRetirementUsed())
                .retirementRemaining(calculateRemaining(allocation.getRetirementAllocation(), allocation.getRetirementUsed()))
                .educationAllocation(allocation.getEducationAllocation())
                .educationUsed(allocation.getEducationUsed())
                .educationRemaining(calculateRemaining(allocation.getEducationAllocation(), allocation.getEducationUsed()))
                .transportAllocation(allocation.getTransportAllocation())
                .transportUsed(allocation.getTransportUsed())
                .transportRemaining(calculateRemaining(allocation.getTransportAllocation(), allocation.getTransportUsed()))
                .allocationDate(allocation.getAllocationDate())
                .expiryDate(allocation.getExpiryDate())
                .daysUntilExpiry(daysUntilExpiry)
                .carryoverAmount(allocation.getCarryoverAmount())
                .carryoverFromYear(allocation.getCarryoverFromYear())
                .status(allocation.getStatus())
                .utilizationPercentage(utilization)
                .createdAt(allocation.getCreatedAt())
                .updatedAt(allocation.getUpdatedAt())
                .build();
    }

    private static BigDecimal calculateRemaining(BigDecimal allocation, BigDecimal used) {
        if (allocation == null) return null;
        if (used == null) return allocation;
        return allocation.subtract(used);
    }
}
