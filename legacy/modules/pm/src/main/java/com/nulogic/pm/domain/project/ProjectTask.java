package com.nulogic.pm.domain.project;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity(name = "PmTask")
@Table(name = "project_tasks", schema = "pm", indexes = {
    @Index(name = "idx_pm_task_tenant", columnList = "tenantId"),
    @Index(name = "idx_pm_task_project", columnList = "projectId"),
    @Index(name = "idx_pm_task_assignee", columnList = "assigneeId"),
    @Index(name = "idx_pm_task_parent", columnList = "parentTaskId"),
    @Index(name = "idx_pm_task_status", columnList = "status"),
    @Index(name = "idx_pm_task_milestone", columnList = "milestoneId"),
    @Index(name = "idx_pm_task_code_tenant", columnList = "taskCode,tenantId", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectTask extends TenantAware {

    @Column(nullable = false, length = 50)
    private String taskCode;

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private TaskType type = TaskType.TASK;

    @Column
    private UUID assigneeId;

    @Column(length = 200)
    private String assigneeName;

    @Column
    private UUID reporterId;

    @Column(length = 200)
    private String reporterName;

    @Column
    private UUID parentTaskId;

    @Column
    private UUID milestoneId;

    @Column
    private LocalDate startDate;

    @Column
    private LocalDate dueDate;

    @Column
    private LocalDate completedDate;

    @Column
    private Integer estimatedHours;

    @Column
    private Integer actualHours;

    @Column
    @Builder.Default
    private Integer progressPercentage = 0;

    @Column
    @Builder.Default
    private Integer storyPoints = 0;

    @Column(length = 100)
    private String sprintName;

    @Column
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(length = 500)
    private String tags;

    @Column(length = 20)
    private String color;

    public enum TaskStatus {
        BACKLOG,
        TODO,
        IN_PROGRESS,
        IN_REVIEW,
        BLOCKED,
        DONE,
        CANCELLED
    }

    public enum TaskPriority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum TaskType {
        EPIC,
        STORY,
        TASK,
        SUBTASK,
        BUG,
        FEATURE,
        IMPROVEMENT
    }

    public void start() {
        this.status = TaskStatus.IN_PROGRESS;
        if (this.startDate == null) {
            this.startDate = LocalDate.now();
        }
    }

    public void complete() {
        this.status = TaskStatus.DONE;
        this.completedDate = LocalDate.now();
        this.progressPercentage = 100;
    }

    public void block() {
        this.status = TaskStatus.BLOCKED;
    }

    public void cancel() {
        this.status = TaskStatus.CANCELLED;
    }

    public void moveToReview() {
        this.status = TaskStatus.IN_REVIEW;
    }

    public void updateProgress(int percentage) {
        this.progressPercentage = Math.max(0, Math.min(100, percentage));
        if (this.progressPercentage == 100 && this.status != TaskStatus.DONE) {
            this.status = TaskStatus.IN_REVIEW;
        }
    }

    public void logTime(int hours) {
        this.actualHours = (this.actualHours != null ? this.actualHours : 0) + hours;
    }

    public boolean isOverdue() {
        return dueDate != null &&
               LocalDate.now().isAfter(dueDate) &&
               status != TaskStatus.DONE &&
               status != TaskStatus.CANCELLED;
    }

    public boolean isSubtask() {
        return parentTaskId != null;
    }
}
