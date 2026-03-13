package com.hrms.domain.analytics;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "skill_gaps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SkillGap extends TenantAware {


    @Column(name = "skill_name", nullable = false)
    private String skillName;

    @Column(name = "skill_category")
    private String skillCategory;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "job_family")
    private String jobFamily;

    // Current state
    @Column(name = "current_supply")
    private Integer currentSupply; // Number of employees with this skill

    @Column(name = "required_supply")
    private Integer requiredSupply; // Number of employees needed with this skill

    @Column(name = "gap_count")
    private Integer gapCount;

    @Column(name = "gap_severity", precision = 5, scale = 2)
    private BigDecimal gapSeverity; // 0-100 scale

    // Proficiency analysis
    @Column(name = "avg_proficiency_level", precision = 3, scale = 1)
    private BigDecimal avgProficiencyLevel; // 1-5 scale

    @Column(name = "required_proficiency_level", precision = 3, scale = 1)
    private BigDecimal requiredProficiencyLevel;

    @Column(name = "proficiency_gap", precision = 3, scale = 1)
    private BigDecimal proficiencyGap;

    // Future projection
    @Column(name = "projected_demand_growth", precision = 5, scale = 2)
    private BigDecimal projectedDemandGrowth; // Percentage

    @Column(name = "projection_date")
    private LocalDate projectionDate;

    @Column(name = "estimated_retirement_loss")
    private Integer estimatedRetirementLoss;

    @Column(name = "estimated_attrition_loss")
    private Integer estimatedAttritionLoss;

    // Resolution strategy
    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_strategy")
    private ResolutionStrategy resolutionStrategy;

    @Column(name = "training_available")
    @Builder.Default
    private Boolean trainingAvailable = false;

    @Column(name = "estimated_training_cost", precision = 12, scale = 2)
    private BigDecimal estimatedTrainingCost;

    @Column(name = "estimated_hiring_cost", precision = 12, scale = 2)
    private BigDecimal estimatedHiringCost;

    @Column(name = "time_to_close_months")
    private Integer timeToCloseMonths;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "analysis_date", nullable = false)
    private LocalDate analysisDate;

    public enum ResolutionStrategy {
        HIRE,
        TRAIN,
        OUTSOURCE,
        HYBRID,
        NOT_DETERMINED
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
}
