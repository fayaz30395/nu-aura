package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Records an employee's selection (opt-in) for a specific restricted holiday.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "restricted_holiday_selections", indexes = {
    @Index(name = "idx_rhs_tenant_id", columnList = "tenantId"),
    @Index(name = "idx_rhs_employee_id", columnList = "employeeId"),
    @Index(name = "idx_rhs_holiday_id", columnList = "restrictedHolidayId"),
    @Index(name = "idx_rhs_status", columnList = "status")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_rhs_employee_holiday",
        columnNames = {"tenantId", "employeeId", "restrictedHolidayId"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RestrictedHolidaySelection extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "restricted_holiday_id", nullable = false)
    private UUID restrictedHolidayId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "restricted_holiday_id", insertable = false, updatable = false)
    private RestrictedHoliday restrictedHoliday;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SelectionStatus status = SelectionStatus.PENDING;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    public enum SelectionStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }
}
