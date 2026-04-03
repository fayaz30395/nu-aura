package com.hrms.domain.psa;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "psa_projects")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PSAProject {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "project_code", nullable = false, length = 50, unique = true)
    private String projectCode;

    @Column(name = "project_name", nullable = false, length = 200)
    private String projectName;

    @Column(name = "client_id")
    private UUID clientId; // Reference to client/customer

    @Column(name = "project_manager_id")
    private UUID projectManagerId;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "billing_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private BillingType billingType;

    @Column(name = "billing_rate", precision = 10, scale = 2)
    private BigDecimal billingRate; // Per hour rate for T&M projects

    @Column(name = "budget", precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(name = "is_billable", nullable = false)
    private Boolean isBillable;

    @Column(name = "status", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ProjectStatus status;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

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

    public enum BillingType {
        TIME_AND_MATERIAL,  // T&M - Bill based on hours
        FIXED_PRICE,        // Fixed price project
        NON_BILLABLE,       // Internal projects
        RETAINER           // Monthly retainer
    }

    public enum ProjectStatus {
        PLANNED,
        ACTIVE,
        ON_HOLD,
        COMPLETED,
        CANCELLED
    }
}
