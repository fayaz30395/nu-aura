package com.hrms.domain.project;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity(name = "HrmsTimeEntry")
@Table(name = "time_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimeEntry {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "hours_worked", precision = 5, scale = 2, nullable = false)
    private BigDecimal hoursWorked;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "task_name", length = 200)
    private String taskName;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 20)
    private EntryType entryType;

    @Column(name = "is_billable", nullable = false)
    private Boolean isBillable = true;

    @Column(name = "billing_rate", precision = 10, scale = 2)
    private BigDecimal billingRate;

    @Column(name = "billed_amount", precision = 15, scale = 2)
    private BigDecimal billedAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TimeEntryStatus status;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "rejected_reason", columnDefinition = "TEXT")
    private String rejectedReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum EntryType {
        REGULAR,
        OVERTIME,
        MEETING,
        TRAINING,
        SUPPORT,
        DEVELOPMENT,
        TESTING,
        DOCUMENTATION,
        OTHER
    }

    public enum TimeEntryStatus {
        DRAFT,
        SUBMITTED,
        APPROVED,
        REJECTED,
        BILLED
    }
}
