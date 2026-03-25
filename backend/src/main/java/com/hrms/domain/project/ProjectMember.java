package com.hrms.domain.project;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity(name = "HrmsProjectMember")
@Table(name = "project_members")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMember {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private ProjectRole role;

    @Column(name = "allocation_percentage", precision = 5, scale = 2)
    private BigDecimal allocationPercentage;

    @Column(name = "billing_rate", precision = 10, scale = 2)
    private BigDecimal billingRate;

    @Column(name = "cost_rate", precision = 10, scale = 2)
    private BigDecimal costRate;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "can_approve_time", nullable = false)
    private Boolean canApproveTime = false;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ProjectRole {
        PROJECT_MANAGER,
        TEAM_LEAD,
        TECHNOLOGY_LEAD,
        DEVELOPER,
        SENIOR_DEVELOPER,
        JUNIOR_DEVELOPER,
        QA_ENGINEER,
        DESIGNER,
        BUSINESS_ANALYST,
        ARCHITECT,
        CONSULTANT,
        MEMBER
    }
}
