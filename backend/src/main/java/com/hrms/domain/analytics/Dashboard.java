package com.hrms.domain.analytics;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dashboards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dashboard {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "dashboard_name", nullable = false, length = 200)
    private String dashboardName;

    @Column(name = "dashboard_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private DashboardType dashboardType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "layout_config", columnDefinition = "TEXT")
    private String layoutConfig; // JSON for dashboard layout

    @Column(name = "is_default")
    private Boolean isDefault;

    @Column(name = "is_public")
    private Boolean isPublic;

    @Column(name = "owner_id")
    private UUID ownerId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public enum DashboardType {
        EXECUTIVE,
        HR_MANAGER,
        DEPARTMENT_MANAGER,
        EMPLOYEE,
        CUSTOM
    }
}
