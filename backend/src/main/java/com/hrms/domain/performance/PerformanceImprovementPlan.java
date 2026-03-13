package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "performance_improvement_plans", indexes = {
    @Index(name = "idx_pip_tenant", columnList = "tenantId"),
    @Index(name = "idx_pip_employee", columnList = "tenantId,employee_id"),
    @Index(name = "idx_pip_manager", columnList = "tenantId,manager_id"),
    @Index(name = "idx_pip_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PerformanceImprovementPlan extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "manager_id", nullable = false)
    private UUID managerId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private PIPStatus status = PIPStatus.ACTIVE;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(columnDefinition = "TEXT")
    private String goals; // JSON: [{goalText, targetDate, achieved}]

    @Column(name = "check_in_frequency", length = 20)
    @Builder.Default
    private String checkInFrequency = "BIWEEKLY";

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "close_notes", columnDefinition = "TEXT")
    private String closeNotes;

    public enum PIPStatus {
        ACTIVE,
        COMPLETED,
        EXTENDED,
        TERMINATED
    }
}
