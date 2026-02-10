package com.hrms.domain.project;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity(name = "HrmsProject")
@Table(name = "projects", indexes = {
        @Index(name = "idx_project_tenant", columnList = "tenantId"),
        @Index(name = "idx_project_code_tenant", columnList = "projectCode,tenantId", unique = true),
        @Index(name = "idx_project_status", columnList = "status"),
        @Index(name = "idx_project_manager", columnList = "projectManagerId")
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

    @Column(nullable = false)
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column
    private LocalDate expectedEndDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Priority priority;

    @Column
    private UUID projectManagerId;

    @Column(length = 200)
    private String clientName;

    @Column(precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(length = 3)
    private String currency;

    public enum ProjectStatus {
        DRAFT,
        PLANNED,
        IN_PROGRESS,
        ON_HOLD,
        COMPLETED,
        CANCELLED
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public void start() {
        this.status = ProjectStatus.IN_PROGRESS;
    }

    public void complete() {
        this.status = ProjectStatus.COMPLETED;
        this.endDate = LocalDate.now();
    }

    public void hold() {
        this.status = ProjectStatus.ON_HOLD;
    }

    public void cancel() {
        this.status = ProjectStatus.CANCELLED;
        this.endDate = LocalDate.now();
    }
}
