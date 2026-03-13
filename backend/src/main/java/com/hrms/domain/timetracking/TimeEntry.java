package com.hrms.domain.timetracking;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity(name = "TimeEntry")
@Table(name = "time_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TimeEntry extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "task_id")
    private UUID taskId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "hours_worked", precision = 5, scale = 2, nullable = false)
    private BigDecimal hoursWorked;

    @Column(name = "billable_hours", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal billableHours = BigDecimal.ZERO;

    @Column(name = "is_billable")
    @Builder.Default
    private Boolean isBillable = false;

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "billing_amount", precision = 12, scale = 2)
    private BigDecimal billingAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type")
    @Builder.Default
    private EntryType entryType = EntryType.REGULAR;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private TimeEntryStatus status = TimeEntryStatus.DRAFT;

    @Column(name = "submitted_date")
    private LocalDate submittedDate;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "client_id")
    private UUID clientId;

    @Column(name = "client_name")
    private String clientName;

    @Column(name = "external_ref")
    private String externalRef;

    public enum EntryType {
        REGULAR,
        OVERTIME,
        LEAVE,
        HOLIDAY,
        TRAINING,
        MEETING,
        BREAK,
        OTHER
    }

    public enum TimeEntryStatus {
        DRAFT,
        SUBMITTED,
        APPROVED,
        REJECTED,
        BILLED,
        PAID
    }

    public void calculateBilling() {
        if (isBillable && hourlyRate != null && billableHours != null) {
            this.billingAmount = hourlyRate.multiply(billableHours);
        } else {
            this.billingAmount = BigDecimal.ZERO;
        }
    }
}
