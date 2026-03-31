package com.nulogic.pm.domain.project;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity(name = "PmProject")
@Table(name = "projects", schema = "pm", indexes = {
    @Index(name = "idx_pm_project_tenant", columnList = "tenantId"),
    @Index(name = "idx_pm_project_code_tenant", columnList = "projectCode,tenantId", unique = true),
    @Index(name = "idx_pm_project_status", columnList = "status"),
    @Index(name = "idx_pm_project_owner", columnList = "ownerId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends TenantAware {

    @Column(nullable = false, length = 50)
    private String projectCode;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.PLANNING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column
    private UUID ownerId;

    @Column(length = 200)
    private String ownerName;

    @Column
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column
    private LocalDate targetEndDate;

    @Column(length = 200)
    private String clientName;

    @Column(precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column
    @Builder.Default
    private Integer progressPercentage = 0;

    @Column(length = 20)
    private String color;

    @Column(length = 500)
    private String tags;

    @Column
    @Builder.Default
    private Boolean isArchived = false;

    public enum ProjectStatus {
        PLANNING,
        IN_PROGRESS,
        ON_HOLD,
        COMPLETED,
        CANCELLED,
        ARCHIVED
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public void start() {
        this.status = ProjectStatus.IN_PROGRESS;
        if (this.startDate == null) {
            this.startDate = LocalDate.now();
        }
    }

    public void complete() {
        this.status = ProjectStatus.COMPLETED;
        this.endDate = LocalDate.now();
        this.progressPercentage = 100;
    }

    public void hold() {
        this.status = ProjectStatus.ON_HOLD;
    }

    public void cancel() {
        this.status = ProjectStatus.CANCELLED;
        this.endDate = LocalDate.now();
    }

    public void archive() {
        this.status = ProjectStatus.ARCHIVED;
        this.isArchived = true;
    }

    public void updateProgress(int percentage) {
        this.progressPercentage = Math.max(0, Math.min(100, percentage));
    }

    public boolean isOverdue() {
        return targetEndDate != null &&
               LocalDate.now().isAfter(targetEndDate) &&
               status != ProjectStatus.COMPLETED &&
               status != ProjectStatus.CANCELLED &&
               status != ProjectStatus.ARCHIVED;
    }
}
