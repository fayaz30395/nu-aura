package com.nulogic.domain.project;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity(name = "HrmsProject")
@Table(name = "projects", indexes = {
        @Index(name = "idx_project_tenant", columnList = "tenant_id"),
        @Index(name = "idx_project_code_tenant", columnList = "project_code,tenant_id", unique = true),
        @Index(name = "idx_project_status", columnList = "status"),
        @Index(name = "idx_project_manager", columnList = "project_manager_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
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

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_type", nullable = false, length = 20)
    @Builder.Default
    private BillingType billingType = BillingType.NON_BILLABLE;

    @Column(name = "is_billable", nullable = false)
    @Builder.Default
    private Boolean isBillable = false;

    @Column(name = "default_billing_rate", precision = 10, scale = 2)
    private BigDecimal defaultBillingRate;

    @Column(name = "client_id")
    private UUID clientId;

    public void start() {
        this.status = ProjectStatus.IN_PROGRESS;
    }

    public void complete() {
        this.status = ProjectStatus.COMPLETED;
        this.endDate = LocalDate.now(); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public void hold() {
        this.status = ProjectStatus.ON_HOLD;
    }

    public void cancel() {
        this.status = ProjectStatus.CANCELLED;
        this.endDate = LocalDate.now(); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

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

    public enum BillingType {
        TIME_AND_MATERIAL,
        FIXED_PRICE,
        NON_BILLABLE,
        RETAINER
    }
}
