package com.nulogic.pm.domain.project;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity(name = "PmProjectMilestone")
@Table(name = "project_milestones", schema = "pm", indexes = {
    @Index(name = "idx_pm_milestone_tenant", columnList = "tenantId"),
    @Index(name = "idx_pm_milestone_project", columnList = "projectId"),
    @Index(name = "idx_pm_milestone_status", columnList = "status"),
    @Index(name = "idx_pm_milestone_due_date", columnList = "dueDate")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMilestone extends TenantAware {

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MilestoneStatus status = MilestoneStatus.PENDING;

    @Column
    private LocalDate startDate;

    @Column
    private LocalDate dueDate;

    @Column
    private LocalDate completedDate;

    @Column
    @Builder.Default
    private Integer progressPercentage = 0;

    @Column
    private UUID ownerId;

    @Column(length = 200)
    private String ownerName;

    @Column
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(length = 20)
    private String color;

    public enum MilestoneStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        OVERDUE,
        CANCELLED
    }

    public void start() {
        this.status = MilestoneStatus.IN_PROGRESS;
        if (this.startDate == null) {
            this.startDate = LocalDate.now();
        }
    }

    public void complete() {
        this.status = MilestoneStatus.COMPLETED;
        this.completedDate = LocalDate.now();
        this.progressPercentage = 100;
    }

    public void cancel() {
        this.status = MilestoneStatus.CANCELLED;
    }

    public void updateProgress(int percentage) {
        this.progressPercentage = Math.max(0, Math.min(100, percentage));
        if (this.progressPercentage == 100 && this.status != MilestoneStatus.COMPLETED) {
            this.status = MilestoneStatus.COMPLETED;
            this.completedDate = LocalDate.now();
        }
    }

    public void checkOverdue() {
        if (dueDate != null &&
            LocalDate.now().isAfter(dueDate) &&
            status != MilestoneStatus.COMPLETED &&
            status != MilestoneStatus.CANCELLED) {
            this.status = MilestoneStatus.OVERDUE;
        }
    }

    public boolean isOverdue() {
        return dueDate != null &&
               LocalDate.now().isAfter(dueDate) &&
               status != MilestoneStatus.COMPLETED &&
               status != MilestoneStatus.CANCELLED;
    }
}
