package com.hrms.domain.employee;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity to track employment detail change requests that require HR approval.
 * When Admin/Super Admin edits employment details, a change request is created
 * and must be approved by HR Manager before the changes are applied.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "employment_change_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmploymentChangeRequest extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "requester_id", nullable = false)
    private UUID requesterId;

    @Column(name = "approver_id")
    private UUID approverId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ChangeRequestStatus status = ChangeRequestStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false, length = 50)
    private ChangeType changeType;

    // Current values (before change)
    @Column(name = "current_designation")
    private String currentDesignation;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_level", length = 50)
    private Employee.EmployeeLevel currentLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_job_role", length = 50)
    private Employee.JobRole currentJobRole;

    @Column(name = "current_department_id")
    private UUID currentDepartmentId;

    @Column(name = "current_manager_id")
    private UUID currentManagerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_employment_type", length = 20)
    private Employee.EmploymentType currentEmploymentType;

    @Column(name = "current_confirmation_date")
    private LocalDate currentConfirmationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_status", length = 20)
    private Employee.EmployeeStatus currentEmployeeStatus;

    // Requested new values
    @Column(name = "new_designation")
    private String newDesignation;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_level", length = 50)
    private Employee.EmployeeLevel newLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_job_role", length = 50)
    private Employee.JobRole newJobRole;

    @Column(name = "new_department_id")
    private UUID newDepartmentId;

    @Column(name = "new_manager_id")
    private UUID newManagerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_employment_type", length = 20)
    private Employee.EmploymentType newEmploymentType;

    @Column(name = "new_confirmation_date")
    private LocalDate newConfirmationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", length = 20)
    private Employee.EmployeeStatus newEmployeeStatus;

    // Metadata
    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    /**
     * Determines the change type based on what fields are being modified
     */
    public static ChangeType determineChangeType(
            String currentDesignation, String newDesignation,
            Employee.EmployeeLevel currentLevel, Employee.EmployeeLevel newLevel,
            UUID currentDeptId, UUID newDeptId,
            UUID currentManagerId, UUID newManagerId,
            Employee.JobRole currentRole, Employee.JobRole newRole,
            Employee.EmployeeStatus currentStatus, Employee.EmployeeStatus newStatus,
            LocalDate currentConfirmation, LocalDate newConfirmation
    ) {
        int changedFields = 0;
        ChangeType primaryType = null;

        // Check department change (Transfer)
        if (newDeptId != null && !newDeptId.equals(currentDeptId)) {
            changedFields++;
            primaryType = ChangeType.TRANSFER;
        }

        // Check level change (Promotion/Demotion)
        if (newLevel != null && newLevel != currentLevel) {
            changedFields++;
            if (newLevel.ordinal() > (currentLevel != null ? currentLevel.ordinal() : 0)) {
                primaryType = ChangeType.PROMOTION;
            } else {
                primaryType = ChangeType.DEMOTION;
            }
        }

        // Check manager change
        if (newManagerId != null && !newManagerId.equals(currentManagerId)) {
            changedFields++;
            if (primaryType == null) primaryType = ChangeType.MANAGER_CHANGE;
        }

        // Check role change
        if (newRole != null && newRole != currentRole) {
            changedFields++;
            if (primaryType == null) primaryType = ChangeType.ROLE_CHANGE;
        }

        // Check status change
        if (newStatus != null && newStatus != currentStatus) {
            changedFields++;
            if (primaryType == null) primaryType = ChangeType.STATUS_CHANGE;
        }

        // Check confirmation date change
        if (newConfirmation != null && !newConfirmation.equals(currentConfirmation)) {
            changedFields++;
            if (primaryType == null) primaryType = ChangeType.CONFIRMATION;
        }

        // Check designation change (without level change)
        if (newDesignation != null && !newDesignation.equals(currentDesignation) && primaryType == null) {
            changedFields++;
            primaryType = ChangeType.ROLE_CHANGE;
        }

        if (changedFields > 1) {
            return ChangeType.MULTIPLE;
        }

        return primaryType != null ? primaryType : ChangeType.MULTIPLE;
    }

    public enum ChangeRequestStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }

    public enum ChangeType {
        PROMOTION,           // Level/designation upgrade
        DEMOTION,           // Level/designation downgrade
        TRANSFER,           // Department change
        ROLE_CHANGE,        // Job role change
        MANAGER_CHANGE,     // Reporting line change
        STATUS_CHANGE,      // Employment status change
        CONFIRMATION,       // Confirmation date update
        MULTIPLE            // Multiple fields changed
    }
}
