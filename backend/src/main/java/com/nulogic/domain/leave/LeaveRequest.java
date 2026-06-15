package com.nulogic.domain.leave;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
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
@EntityListeners(TimeAuditingEntityListener.class)
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

    @TenantTimestamp
    @Column(name = "applied_on", nullable = false)
    private LocalDateTime appliedOn;

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

    public void approve(UUID approverId, LocalDateTime now) {
        approve(approverId, null, now);
    }

    public void approve(UUID approverId, String comments, LocalDateTime now) {
        if (this.status != LeaveRequestStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be approved");
        }
        this.status = LeaveRequestStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedOn = now;
        this.comments = comments;
    }

    public void reject(UUID approverId, String reason, LocalDateTime now) {
        if (this.status != LeaveRequestStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be rejected");
        }
        this.status = LeaveRequestStatus.REJECTED;
        this.approvedBy = approverId;
        this.approvedOn = now;
        this.rejectionReason = reason;
    }

    public void cancel(String reason, LocalDateTime now) {
        if (this.status == LeaveRequestStatus.REJECTED || this.status == LeaveRequestStatus.CANCELLED) {
            throw new IllegalStateException("Cannot cancel leave request in status: " + this.status);
        }
        this.status = LeaveRequestStatus.CANCELLED;
        this.cancelledOn = now;
        this.cancellationReason = reason;
    }

    public boolean isOverlapping(LocalDate start, LocalDate end) {
        return !((end.isBefore(this.startDate)) || (start.isAfter(this.endDate)));
    }

    public boolean isActive() {
        return this.status == LeaveRequestStatus.APPROVED || this.status == LeaveRequestStatus.PENDING;
    }

    /**
     * F2.5: Bean-validation invariant — a half-day request MUST specify which half
     * (MORNING/AFTERNOON). Without this, payroll/attendance integrations have no way
     * to know which half of the day the employee is off. Conversely, a full-day
     * request must not carry a half-day period (defensive, prevents stale data).
     *
     * <p>Annotated with {@link AssertTrue} so Spring's {@code @Valid} on request DTOs
     * and Hibernate's pre-persist validation both enforce it.</p>
     */
    @AssertTrue(message = "halfDayPeriod required when isHalfDay=true and must be null otherwise")
    public boolean isHalfDayPeriodValid() {
        if (Boolean.TRUE.equals(isHalfDay)) {
            return halfDayPeriod != null;
        }
        return halfDayPeriod == null;
    }

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
}
