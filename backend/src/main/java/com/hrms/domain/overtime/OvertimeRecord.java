package com.hrms.domain.overtime;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Records actual overtime worked by an employee, linked to attendance records.
 * Supports approval workflows and payroll integration.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "overtime_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OvertimeRecord extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "attendance_record_id")
    private UUID attendanceRecordId;

    @Column(name = "overtime_date", nullable = false)
    private LocalDate overtimeDate;

    @Column(name = "shift_id")
    private UUID shiftId;

    @Column(name = "regular_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal regularHours;

    @Column(name = "actual_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal actualHours;

    @Column(name = "overtime_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal overtimeHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "overtime_type", nullable = false, length = 20)
    private OvertimeType overtimeType;

    @Column(name = "multiplier", nullable = false, precision = 3, scale = 2)
    private BigDecimal multiplier;

    @Column(name = "effective_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal effectiveHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private OvertimeStatus status = OvertimeStatus.PENDING;

    @Column(name = "is_pre_approved")
    @Builder.Default
    private Boolean isPreApproved = false;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_by")
    private UUID rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "payroll_run_id")
    private UUID payrollRunId;

    @Column(name = "processed_in_payroll")
    @Builder.Default
    private Boolean processedInPayroll = false;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "auto_calculated")
    @Builder.Default
    private Boolean autoCalculated = false;

    /**
     * Returns true if the record can still be modified or deleted.
     */
    public boolean canBeModified() {
        return status == OvertimeStatus.PENDING
                || status == OvertimeStatus.REJECTED;
    }

    public enum OvertimeType {
        REGULAR,
        WEEKEND,
        HOLIDAY,
        NIGHT_SHIFT,
        EMERGENCY
    }

    public enum OvertimeStatus {
        PENDING,
        APPROVED,
        REJECTED,
        PROCESSED,
        PAID,
        CANCELLED
    }
}
