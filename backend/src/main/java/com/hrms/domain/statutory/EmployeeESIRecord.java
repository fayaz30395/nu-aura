package com.hrms.domain.statutory;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "employee_esi_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeESIRecord {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "esi_number", length = 17)
    private String esiNumber;

    @Column(name = "ip_number", length = 20) // Insurance Person Number
    private String ipNumber;

    @Column(name = "enrollment_date")
    private LocalDate enrollmentDate;

    @Column(name = "exit_date")
    private LocalDate exitDate;

    @Column(name = "dispensary_name", length = 200)
    private String dispensaryName;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ESIStatus status;

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

    public enum ESIStatus {
        ACTIVE,
        INACTIVE,
        EXEMPTED
    }
}
