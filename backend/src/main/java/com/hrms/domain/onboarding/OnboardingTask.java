package com.hrms.domain.onboarding;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "onboarding_tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OnboardingTask extends TenantAware {


    @Column(name = "process_id", nullable = false)
    private UUID processId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "task_name", nullable = false)
    private String taskName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private TaskCategory category;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    @Column(name = "order_sequence")
    private Integer orderSequence;

    @Column(name = "completed_by")
    private UUID completedBy;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "dependent_on_task_id")
    private UUID dependentOnTaskId;

    public enum TaskCategory {
        DOCUMENTATION,
        IT_SETUP,
        HR_FORMALITIES,
        TRAINING,
        TEAM_INTRODUCTION,
        WORKSPACE_SETUP,
        ACCESS_PERMISSIONS,
        COMPLIANCE,
        BENEFITS_ENROLLMENT,
        OTHER
    }

    public enum TaskStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        SKIPPED,
        BLOCKED
    }

    public enum TaskPriority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
}
