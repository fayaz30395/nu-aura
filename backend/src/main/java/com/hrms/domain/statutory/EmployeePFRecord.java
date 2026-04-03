package com.hrms.domain.statutory;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "employee_pf_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeePFRecord {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "uan_number", length = 12) // Universal Account Number
    private String uanNumber;

    @Column(name = "pf_number", length = 50)
    private String pfNumber;

    @Column(name = "enrollment_date")
    private LocalDate enrollmentDate;

    @Column(name = "exit_date")
    private LocalDate exitDate;

    @Column(name = "vpf_percentage", precision = 5, scale = 2)
    private BigDecimal vpfPercentage; // Voluntary PF contribution

    @Column(name = "is_international_worker")
    private Boolean isInternationalWorker;

    @Column(name = "previous_pf_balance", precision = 12, scale = 2)
    private BigDecimal previousPfBalance;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private PFStatus status;

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

    public enum PFStatus {
        ACTIVE,
        INACTIVE,
        WITHDRAWN,
        TRANSFERRED
    }
}
