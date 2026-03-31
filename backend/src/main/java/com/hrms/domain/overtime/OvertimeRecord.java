package com.hrms.domain.overtime;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "overtime_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "attendance_record_id")
    private UUID attendanceRecordId;

    @Column(name = "overtime_date", nullable = false)
    private LocalDate overtimeDate;

    @Column(name = "shift_id")
    private UUID shiftId;

    @Column(name = "regular_hours", precision = 5, scale = 2, nullable = false)
    private BigDecimal regularHours;

    @Column(name = "actual_hours", precision = 5, scale = 2, nullable = false)
    private BigDecimal actualHours;

    @Column(name = "overtime_hours", precision = 5, scale = 2, nullable = false)
    private BigDecimal overtimeHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "overtime_type", nullable = false, length = 20)
    private OvertimeType overtimeType;

    @Column(name = "multiplier", precision = 3, scale = 2, nullable = false)
    private BigDecimal multiplier; // e.g., 1.5, 2.0

    @Column(name = "effective_hours", precision = 5, scale = 2, nullable = false)
    private BigDecimal effectiveHours; // overtime_hours * multiplier

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OvertimeStatus status = OvertimeStatus.PENDING;

    @Builder.Default
    @Column(name = "is_pre_approved")
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

    @Builder.Default
    @Column(name = "processed_in_payroll")
    private Boolean processedInPayroll = false;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(name = "auto_calculated")
    private Boolean autoCalculated = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Version
    @Column(name = "version")
    private Long version;

    public enum OvertimeType {
        REGULAR,        // Regular overtime (1.5x)
        WEEKEND,        // Weekend overtime (2x)
        HOLIDAY,        // Holiday overtime (2.5x)
        NIGHT,          // Night shift overtime
        EXTENDED        // Extended hours overtime
    }

    public enum OvertimeStatus {
        PENDING,        // Awaiting approval
        APPROVED,       // Approved
        REJECTED,       // Rejected
        PROCESSED,      // Processed in payroll
        PAID            // Paid
    }

    /**
     * Calculate effective overtime hours based on multiplier
     */
    public void calculateEffectiveHours() {
        if (overtimeHours != null && multiplier != null) {
            this.effectiveHours = overtimeHours.multiply(multiplier);
        }
    }

    /**
     * Check if can be modified
     */
    public boolean canBeModified() {
        return status == OvertimeStatus.PENDING && !processedInPayroll;
    }

    /**
     * Check if ready for payroll
     */
    public boolean isReadyForPayroll() {
        return status == OvertimeStatus.APPROVED && !processedInPayroll;
    }
}
