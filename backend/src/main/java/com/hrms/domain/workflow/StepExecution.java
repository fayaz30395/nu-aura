package com.hrms.domain.workflow;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Step Execution - Tracks the execution of a single approval step.
 * Records who approved/rejected and when.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "step_executions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StepExecution extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_execution_id", nullable = false)
    private WorkflowExecution workflowExecution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approval_step_id", nullable = false)
    private ApprovalStep approvalStep;

    private int stepOrder;

    private String stepName;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private StepStatus status;

    // Who was assigned to approve
    private UUID assignedToUserId;
    private String assignedToUserName;

    // Alternative approvers (comma-separated UUIDs)
    private String alternativeApprovers;

    // Who actually took action
    private UUID actionByUserId;
    private String actionByUserName;

    // Was it delegated?
    private boolean delegated;
    private UUID delegatedFromUserId;

    @Enumerated(EnumType.STRING)
    private ApprovalAction action;

    @Column(columnDefinition = "TEXT")
    private String comments;

    // Attachments (stored as JSON array of file paths/IDs)
    @Column(columnDefinition = "TEXT")
    private String attachmentsJson;

    // Deadline for this step
    private LocalDateTime deadline;

    // Escalation tracking
    private boolean escalated;
    private LocalDateTime escalatedAt;
    private UUID escalatedToUserId;

    // Reminder tracking
    private int reminderCount;
    private LocalDateTime lastReminderSentAt;

    // Timing
    private LocalDateTime assignedAt;
    private LocalDateTime executedAt;

    // Time taken in hours
    private Double timeTakenHours;

    // Device/IP info for audit
    private String actionDeviceInfo;
    private String actionIpAddress;

    @PrePersist
    protected void onCreate() {
        assignedAt = LocalDateTime.now();
        if (status == null) status = StepStatus.PENDING;
    }

    public void approve(UUID userId, String userName, String comments) {
        this.status = StepStatus.APPROVED;
        this.action = ApprovalAction.APPROVE;
        this.actionByUserId = userId;
        this.actionByUserName = userName;
        this.comments = comments;
        this.executedAt = LocalDateTime.now();
        calculateTimeTaken();
    }

    public void reject(UUID userId, String userName, String comments) {
        this.status = StepStatus.REJECTED;
        this.action = ApprovalAction.REJECT;
        this.actionByUserId = userId;
        this.actionByUserName = userName;
        this.comments = comments;
        this.executedAt = LocalDateTime.now();
        calculateTimeTaken();
    }

    public void returnForModification(UUID userId, String userName, String comments) {
        this.status = StepStatus.RETURNED;
        this.action = ApprovalAction.RETURN_FOR_MODIFICATION;
        this.actionByUserId = userId;
        this.actionByUserName = userName;
        this.comments = comments;
        this.executedAt = LocalDateTime.now();
        calculateTimeTaken();
    }

    @SuppressWarnings("unused")
    public void delegate(UUID userId, String userName, UUID delegateToUserId) {
        this.status = StepStatus.DELEGATED;
        this.action = ApprovalAction.DELEGATE;
        this.delegated = true;
        this.delegatedFromUserId = userId;
        this.assignedToUserId = delegateToUserId;
        this.executedAt = LocalDateTime.now();
    }

    public void escalate(UUID escalateToUserId) {
        this.status = StepStatus.ESCALATED;
        this.action = ApprovalAction.ESCALATE;
        this.escalated = true;
        this.escalatedAt = LocalDateTime.now();
        this.escalatedToUserId = escalateToUserId;
    }

    private void calculateTimeTaken() {
        if (assignedAt != null && executedAt != null) {
            long hours = java.time.Duration.between(assignedAt, executedAt).toHours();
            this.timeTakenHours = (double) hours;
        }
    }

    public boolean isOverdue() {
        return deadline != null && LocalDateTime.now().isAfter(deadline) && status == StepStatus.PENDING;
    }

    public boolean canBeActedUponBy(UUID userId) {
        if (status != StepStatus.PENDING) return false;
        if (assignedToUserId != null && assignedToUserId.equals(userId)) return true;
        if (alternativeApprovers != null && alternativeApprovers.contains(userId.toString())) return true;
        return false;
    }

    public enum StepStatus {
        PENDING,         // Waiting for action
        APPROVED,        // Approved at this step
        REJECTED,        // Rejected at this step
        SKIPPED,         // Skipped (optional step)
        ESCALATED,       // Escalated to another user
        DELEGATED,       // Delegated to another user
        EXPIRED,         // Timed out
        RETURNED         // Returned for modification
    }

    public enum ApprovalAction {
        APPROVE,
        REJECT,
        RETURN_FOR_MODIFICATION,
        DELEGATE,
        ESCALATE,
        SKIP,
        HOLD
    }
}
