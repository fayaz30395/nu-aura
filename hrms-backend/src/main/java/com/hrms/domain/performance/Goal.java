package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Goal extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "goal_type", length = 50)
    private GoalType goalType;

    @Column(length = 100)
    private String category;

    @Column(name = "target_value", precision = 19, scale = 2)
    private BigDecimal targetValue;

    @Column(name = "current_value", precision = 19, scale = 2)
    private BigDecimal currentValue;

    @Column(name = "measurement_unit", length = 50)
    private String measurementUnit;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    @Builder.Default
    private GoalStatus status = GoalStatus.DRAFT;

    @Column(name = "progress_percentage")
    @Builder.Default
    private Integer progressPercentage = 0;

    @Column(name = "parent_goal_id")
    private UUID parentGoalId;

    @Column
    @Builder.Default
    private Integer weight = 100;

    @Column(name = "approved_by")
    private UUID approvedBy;

    public enum GoalType {
        OKR,        // Objectives and Key Results
        KPI,        // Key Performance Indicator
        PERSONAL,   // Personal development goal
        TEAM        // Team goal
    }

    public enum GoalStatus {
        DRAFT,
        ACTIVE,
        COMPLETED,
        CANCELLED,
        ON_HOLD
    }
}
