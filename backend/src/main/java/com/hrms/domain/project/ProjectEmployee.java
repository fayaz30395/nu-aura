package com.hrms.domain.project;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity mapped to the project_employees VIEW.
 * This view is backed by the project_members table (see V55 migration).
 * Does NOT extend BaseEntity/TenantAware because the view lacks
 * created_by, updated_by, version, is_deleted, deleted_at columns.
 */
@Entity(name = "HrmsProjectEmployee")
@Table(name = "project_employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectEmployee {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "role", length = 100)
    private String role;

    @Column(name = "allocation_percentage")
    private Integer allocationPercentage;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void deactivate() {
        this.isActive = false;
        this.endDate = LocalDate.now();
    }

    public void activate() {
        this.isActive = true;
        this.endDate = null;
    }
}
