package com.nulogic.domain.project;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Backwards-compatible allocation entity backed by the project_members table.
 * The legacy project_employees name is a view (see V55 migration), but writes
 * must target project_members because the view contains casted columns.
 * Does NOT extend BaseEntity/TenantAware to preserve the legacy DTO-facing
 * shape used by allocation services.
 */
@Entity(name = "HrmsProjectEmployee")
@Table(name = "project_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Builder.Default
    @Column(name = "role", nullable = false, length = 30)
    private String role = "MEMBER";

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "allocation_percentage", precision = 5, scale = 2)
    private Integer allocationPercentage;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void deactivate() {
        this.isActive = false;
        this.endDate = LocalDate.now(); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public void activate() {
        this.isActive = true;
        this.endDate = null;
    }
}
