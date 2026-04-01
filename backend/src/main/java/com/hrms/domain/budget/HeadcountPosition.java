package com.hrms.domain.budget;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "headcount_positions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class HeadcountPosition extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_id", nullable = false)
    private HeadcountBudget budget;

    @Column(name = "position_code")
    private String positionCode;

    @Column(name = "position_title", nullable = false)
    private String positionTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PositionType positionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PositionStatus status = PositionStatus.PLANNED;

    @Column(name = "job_level")
    private String jobLevel;

    @Column(name = "job_family")
    private String jobFamily;

    @Column(name = "location")
    private String location;

    @Column(name = "employment_type")
    private String employmentType; // FULL_TIME, PART_TIME, CONTRACT

    @Column(name = "fte_count", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal fteCount = BigDecimal.ONE;

    // Compensation
    @Column(name = "min_salary", precision = 12, scale = 2)
    private BigDecimal minSalary;

    @Column(name = "max_salary", precision = 12, scale = 2)
    private BigDecimal maxSalary;

    @Column(name = "budgeted_salary", precision = 12, scale = 2)
    private BigDecimal budgetedSalary;

    @Column(name = "budgeted_benefits", precision = 12, scale = 2)
    private BigDecimal budgetedBenefits;

    @Column(name = "total_cost", precision = 12, scale = 2)
    private BigDecimal totalCost;

    // Timeline
    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_fill_date")
    private LocalDate plannedFillDate;

    @Column(name = "actual_fill_date")
    private LocalDate actualFillDate;

    // Incumbents
    @Column(name = "current_employee_id")
    private UUID currentEmployeeId;

    @Column(name = "replacement_for")
    private UUID replacementFor;

    // Requisition link
    @Column(name = "requisition_id")
    private UUID requisitionId;

    @Column(name = "justification", columnDefinition = "TEXT")
    private String justification;

    @Column(name = "hiring_manager_id")
    private UUID hiringManagerId;

    public enum PositionType {
        NEW_ROLE,
        REPLACEMENT,
        CONVERSION,
        UPGRADE,
        BACKFILL
    }

    public enum PositionStatus {
        PLANNED,
        APPROVED,
        OPEN,
        IN_PROGRESS,
        FILLED,
        CANCELLED,
        ON_HOLD
    }

    @PrePersist
    @PreUpdate
    protected void calculateTotalCost() {
        totalCost = BigDecimal.ZERO;
        if (budgetedSalary != null) totalCost = totalCost.add(budgetedSalary);
        if (budgetedBenefits != null) totalCost = totalCost.add(budgetedBenefits);
    }
}
