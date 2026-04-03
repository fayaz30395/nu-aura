package com.hrms.domain.shift;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shift_assignments",
    indexes = {
        @Index(name = "idx_shift_assignment_tenant", columnList = "tenant_id"),
        @Index(name = "idx_shift_assignment_tenant_employee", columnList = "tenant_id,employee_id"),
        @Index(name = "idx_shift_assignment_employee_date", columnList = "employee_id,assignment_date"),
        @Index(name = "idx_shift_assignment_shift_date", columnList = "shift_id,assignment_date"),
        @Index(name = "idx_shift_assignment_effective", columnList = "effective_from,effective_to"),
        @Index(name = "idx_shift_assignment_status", columnList = "status")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_shift_assignment_employee_effective", columnNames = {"employee_id", "effective_from"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "shift_id", nullable = false)
    private UUID shiftId;

    @Column(name = "assignment_date", nullable = false)
    private LocalDate assignmentDate;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_type", nullable = false, length = 20)
    private AssignmentType assignmentType;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AssignmentStatus status = AssignmentStatus.ACTIVE;

    @Builder.Default
    @Column(name = "is_recurring")
    private Boolean isRecurring = false;

    @Column(name = "recurrence_pattern", length = 50)
    private String recurrencePattern; // e.g., "WEEKLY", "BIWEEKLY", "MONTHLY"

    @Column(name = "assigned_by")
    private UUID assignedBy;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

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

    public enum AssignmentType {
        PERMANENT,   // Permanent shift assignment
        TEMPORARY,   // Temporary shift change
        ROTATION,    // Part of rotation schedule
        OVERRIDE     // One-time override
    }

    public enum AssignmentStatus {
        ACTIVE,
        COMPLETED,
        CANCELLED,
        PENDING
    }

    /**
     * Check if assignment is currently active
     */
    public boolean isCurrentlyActive() {
        LocalDate today = LocalDate.now();
        boolean afterStart = !today.isBefore(effectiveFrom);
        boolean beforeEnd = effectiveTo == null || !today.isAfter(effectiveTo);
        return status == AssignmentStatus.ACTIVE && afterStart && beforeEnd;
    }
}
