package com.hrms.domain.overtime;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Overtime request for pre-approval or post-facto recording.
 */
@Entity
@Table(name = "overtime_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OvertimeRequest extends TenantAware {

    @Column(nullable = false)
    private UUID employeeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_id")
    private OvertimePolicy policy;

    @Column(nullable = false, unique = true)
    private String requestNumber;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RequestType requestType;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RequestStatus status;

    // Date and time
    @Column(nullable = false)
    private LocalDate overtimeDate;
    private LocalTime plannedStartTime;
    private LocalTime plannedEndTime;
    private BigDecimal plannedHours;

    // Actual times (filled after completion)
    private LocalTime actualStartTime;
    private LocalTime actualEndTime;
    private BigDecimal actualHours;

    // Reason and details
    @Column(nullable = false)
    private String reason;
    private String projectCode;
    private String taskDescription;
    private UUID projectId;

    // OT type flags
    private boolean isWeekend;
    private boolean isHoliday;
    private boolean isNightShift;
    private String holidayName;

    // Calculation results
    private BigDecimal baseHourlyRate;
    private BigDecimal overtimeMultiplier;
    private BigDecimal calculatedAmount;
    private BigDecimal approvedAmount;

    // Comp time option
    private boolean takeAsCompTime;
    private BigDecimal compTimeHours;

    // Approval workflow
    private UUID approvedBy;
    private LocalDateTime approvedAt;
    private String approvalComments;
    private UUID rejectedBy;
    private LocalDateTime rejectedAt;
    private String rejectionReason;

    // Payroll processing
    private boolean processedInPayroll;
    private UUID payrollRunId;
    private LocalDate paymentDate;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    public enum RequestType {
        PRE_APPROVAL,       // Request before working OT
        POST_FACTO,         // Record OT after the fact
        AUTOMATIC           // Auto-generated from attendance
    }

    public enum RequestStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED,
        CANCELLED,
        COMPLETED,
        PAYMENT_PENDING,
        PAID,
        CONVERTED_TO_COMP_TIME
    }

    @PrePersist
    protected void onCreate() {
        if (requestNumber == null) {
            requestNumber = "OT-" + System.currentTimeMillis();
        }
        if (status == null) status = RequestStatus.DRAFT;
    }

    public void approve(UUID approver, String comments) {
        this.status = RequestStatus.APPROVED;
        this.approvedBy = approver;
        this.approvedAt = LocalDateTime.now();
        this.approvalComments = comments;
    }

    public void reject(UUID rejector, String reason) {
        this.status = RequestStatus.REJECTED;
        this.rejectedBy = rejector;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void complete(LocalTime actualStart, LocalTime actualEnd, BigDecimal hours) {
        this.actualStartTime = actualStart;
        this.actualEndTime = actualEnd;
        this.actualHours = hours;
        this.status = RequestStatus.COMPLETED;
    }

    public void convertToCompTime(BigDecimal compHours) {
        this.takeAsCompTime = true;
        this.compTimeHours = compHours;
        this.status = RequestStatus.CONVERTED_TO_COMP_TIME;
    }
}
