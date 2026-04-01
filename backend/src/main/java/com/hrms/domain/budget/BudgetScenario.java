package com.hrms.domain.budget;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "budget_scenarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BudgetScenario extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "base_budget_id")
    private HeadcountBudget baseBudget;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScenarioType scenarioType;

    // Adjustments
    @Column(name = "headcount_adjustment")
    private Integer headcountAdjustment;

    @Column(name = "salary_adjustment_percent", precision = 5, scale = 2)
    private BigDecimal salaryAdjustmentPercent;

    @Column(name = "hiring_freeze")
    @Builder.Default
    private Boolean hiringFreeze = false;

    @Column(name = "attrition_rate_adjustment", precision = 5, scale = 2)
    private BigDecimal attritionRateAdjustment;

    // Calculated impacts
    @Column(name = "projected_headcount")
    private Integer projectedHeadcount;

    @Column(name = "projected_cost", precision = 15, scale = 2)
    private BigDecimal projectedCost;

    @Column(name = "cost_variance", precision = 15, scale = 2)
    private BigDecimal costVariance;

    @Column(name = "variance_percent", precision = 5, scale = 2)
    private BigDecimal variancePercent;

    @Column(name = "is_selected")
    @Builder.Default
    private Boolean isSelected = false;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public enum ScenarioType {
        GROWTH,
        OPTIMIZATION,
        REDUCTION,
        RESTRUCTURING,
        WHAT_IF
    }
}
