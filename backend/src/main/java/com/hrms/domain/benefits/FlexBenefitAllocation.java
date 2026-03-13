package com.hrms.domain.benefits;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Flexible benefit credits allocation and usage tracking.
 */
@Entity
@Table(name = "flex_benefit_allocations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FlexBenefitAllocation extends TenantAware {

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private int fiscalYear;

    // Total allocation
    @Column(nullable = false)
    private BigDecimal totalCredits;

    private BigDecimal usedCredits;
    private BigDecimal remainingCredits;
    private BigDecimal forfeitedCredits;

    // Category-wise allocation limits
    private BigDecimal healthAllocation;
    private BigDecimal healthUsed;
    private BigDecimal wellnessAllocation;
    private BigDecimal wellnessUsed;
    private BigDecimal lifestyleAllocation;
    private BigDecimal lifestyleUsed;
    private BigDecimal retirementAllocation;
    private BigDecimal retirementUsed;
    private BigDecimal educationAllocation;
    private BigDecimal educationUsed;
    private BigDecimal transportAllocation;
    private BigDecimal transportUsed;

    // Dates
    private LocalDate allocationDate;
    private LocalDate expiryDate;

    // Carryover from previous year
    private BigDecimal carryoverAmount;
    private int carryoverFromYear;

    // Status
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AllocationStatus status = AllocationStatus.ACTIVE;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    public enum AllocationStatus {
        PENDING,
        ACTIVE,
        EXHAUSTED,
        EXPIRED,
        FORFEITED
    }

    @PrePersist
    protected void onCreate() {
        if (usedCredits == null) usedCredits = BigDecimal.ZERO;
        if (remainingCredits == null) remainingCredits = totalCredits;
    }

    public void useCredits(BigDecimal amount) {
        if (amount.compareTo(remainingCredits) > 0) {
            throw new IllegalStateException("Insufficient flex credits");
        }
        usedCredits = usedCredits.add(amount);
        remainingCredits = remainingCredits.subtract(amount);
        if (remainingCredits.compareTo(BigDecimal.ZERO) == 0) {
            status = AllocationStatus.EXHAUSTED;
        }
    }

    public void refundCredits(BigDecimal amount) {
        usedCredits = usedCredits.subtract(amount);
        remainingCredits = remainingCredits.add(amount);
        if (status == AllocationStatus.EXHAUSTED) {
            status = AllocationStatus.ACTIVE;
        }
    }

    public void forfeit() {
        forfeitedCredits = remainingCredits;
        remainingCredits = BigDecimal.ZERO;
        status = AllocationStatus.FORFEITED;
    }

    public boolean hasAvailableCredits(BigDecimal amount) {
        return remainingCredits.compareTo(amount) >= 0;
    }
}
