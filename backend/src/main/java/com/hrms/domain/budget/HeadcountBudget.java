package com.hrms.domain.budget;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "headcount_budgets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeadcountBudget extends TenantAware {


    @Column(nullable = false)
    private Integer fiscalYear;

    @Enumerated(EnumType.STRING)
    private Quarter quarter;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "cost_center_id")
    private UUID costCenterId;

    @Column(name = "cost_center_code")
    private String costCenterCode;

    @Column(name = "cost_center")
    private String costCenter;

    @Column(name = "budget_name", nullable = false)
    private String budgetName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 10)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BudgetStatus status = BudgetStatus.DRAFT;

    // Headcount Numbers
    @Column(name = "opening_headcount")
    private Integer openingHeadcount;

    @Column(name = "planned_hires")
    private Integer plannedHires;

    @Column(name = "planned_attrition")
    private Integer plannedAttrition;

    @Column(name = "planned_transfers_in")
    private Integer plannedTransfersIn;

    @Column(name = "planned_transfers_out")
    private Integer plannedTransfersOut;

    @Column(name = "closing_headcount")
    private Integer closingHeadcount;

    // Actual Numbers (tracked over time)
    @Column(name = "actual_headcount")
    private Integer actualHeadcount;

    @Column(name = "current_headcount")
    private Integer currentHeadcount;

    @Column(name = "actual_hires")
    private Integer actualHires;

    @Column(name = "actual_attrition")
    private Integer actualAttrition;

    @Column(name = "attrition_rate", precision = 5, scale = 2)
    private BigDecimal attritionRate;

    // Budget Amounts
    @Column(name = "salary_budget", precision = 15, scale = 2)
    private BigDecimal salaryBudget;

    @Column(name = "benefits_budget", precision = 15, scale = 2)
    private BigDecimal benefitsBudget;

    @Column(name = "bonus_budget", precision = 15, scale = 2)
    private BigDecimal bonusBudget;

    @Column(name = "training_budget", precision = 15, scale = 2)
    private BigDecimal trainingBudget;

    @Column(name = "recruitment_budget", precision = 15, scale = 2)
    private BigDecimal recruitmentBudget;

    @Column(name = "other_budget", precision = 15, scale = 2)
    private BigDecimal otherBudget;

    @Column(name = "contingency_budget", precision = 15, scale = 2)
    private BigDecimal contingencyBudget;

    @Column(name = "total_budget", precision = 15, scale = 2)
    private BigDecimal totalBudget;

    @Column(name = "allocated_budget", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal allocatedBudget = BigDecimal.ZERO;

    // Actual Spend
    @Column(name = "actual_salary_spend", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal actualSalarySpend = BigDecimal.ZERO;

    @Column(name = "actual_total_spend", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal actualTotalSpend = BigDecimal.ZERO;

    // Approval
    @Column(name = "submitted_by")
    private UUID submittedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approval_notes", columnDefinition = "TEXT")
    private String approvalNotes;

    @OneToMany(mappedBy = "budget", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<HeadcountPosition> positions = new ArrayList<>();

    public enum BudgetStatus {
        DRAFT,
        SUBMITTED,
        PENDING_APPROVAL,
        UNDER_REVIEW,
        APPROVED,
        REJECTED,
        CLOSED
    }

    public enum Quarter {
        Q1, Q2, Q3, Q4, ANNUAL
    }

    @PrePersist
    @PreUpdate
    protected void calculateTotals() {
        totalBudget = BigDecimal.ZERO;
        if (salaryBudget != null) totalBudget = totalBudget.add(salaryBudget);
        if (benefitsBudget != null) totalBudget = totalBudget.add(benefitsBudget);
        if (bonusBudget != null) totalBudget = totalBudget.add(bonusBudget);
        if (trainingBudget != null) totalBudget = totalBudget.add(trainingBudget);
        if (recruitmentBudget != null) totalBudget = totalBudget.add(recruitmentBudget);
        if (contingencyBudget != null) totalBudget = totalBudget.add(contingencyBudget);
        if (otherBudget != null) totalBudget = totalBudget.add(otherBudget);

        if (openingHeadcount != null) {
            closingHeadcount = openingHeadcount;
            if (plannedHires != null) closingHeadcount += plannedHires;
            if (plannedAttrition != null) closingHeadcount -= plannedAttrition;
            if (plannedTransfersIn != null) closingHeadcount += plannedTransfersIn;
            if (plannedTransfersOut != null) closingHeadcount -= plannedTransfersOut;
        }
    }
}
