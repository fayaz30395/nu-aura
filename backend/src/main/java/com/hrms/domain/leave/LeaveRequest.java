package com.hrms.domain.leave;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "leave_requests", indexes = {
    @Index(name = "idx_leave_requests_tenant_id", columnList = "tenantId"),
    @Index(name = "idx_leave_requests_employee_id", columnList = "employeeId"),
    @Index(name = "idx_leave_requests_status", columnList = "status"),
    @Index(name = "idx_leave_requests_dates", columnList = "startDate,endDate"),
    @Index(name = "idx_leave_requests_employee_status", columnList = "employeeId,status"),
    @Index(name = "idx_leave_requests_leave_type", columnList = "leave_type_id"),
    @Index(name = "idx_leave_requests_tenant_employee", columnList = "tenantId,employeeId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LeaveRequest extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private UUID leaveTypeId;

    @Column(name = "request_number", nullable = false, length = 50)
    private String requestNumber;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "total_days", nullable = false, precision = 5, scale = 2)
    private BigDecimal totalDays;

    @Column(name = "is_half_day")
    @Builder.Default
    private Boolean isHalfDay = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "half_day_period", length = 20)
    private HalfDayPeriod halfDayPeriod;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private LeaveRequestStatus status = LeaveRequestStatus.PENDING;

    @Column(name = "document_path", columnDefinition = "TEXT")
    private String documentPath;

    @Column(name = "applied_on", nullable = false)
    @Builder.Default
    private LocalDateTime appliedOn = LocalDateTime.now();

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_on")
    private LocalDateTime approvedOn;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "cancelled_on")
    private LocalDateTime cancelledOn;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(columnDefinition = "TEXT")
    private String comments;

    public enum LeaveRequestStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }

    public enum HalfDayPeriod {
        MORNING,
        AFTERNOON
    }

    public void approve(UUID approverId) {
        approve(approverId, null);
    }

    public void approve(UUID approverId, String comments) {
        if (this.status != LeaveRequestStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be approved");
        }
        this.status = LeaveRequestStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedOn = LocalDateTime.now();
        this.comments = comments;
    }

    public void reject(UUID approverId, String reason) {
        if (this.status != LeaveRequestStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be rejected");
        }
        this.status = LeaveRequestStatus.REJECTED;
        this.approvedBy = approverId;
        this.approvedOn = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void cancel(String reason) {
        if (this.status == LeaveRequestStatus.REJECTED || this.status == LeaveRequestStatus.CANCELLED) {
            throw new IllegalStateException("Cannot cancel leave request in status: " + this.status);
        }
        this.status = LeaveRequestStatus.CANCELLED;
        this.cancelledOn = LocalDateTime.now();
        this.cancellationReason = reason;
    }

    public boolean isOverlapping(LocalDate start, LocalDate end) {
        return !((end.isBefore(this.startDate)) || (start.isAfter(this.endDate)));
    }

    public boolean isActive() {
        return this.status == LeaveRequestStatus.APPROVED || this.status == LeaveRequestStatus.PENDING;
    }
}
