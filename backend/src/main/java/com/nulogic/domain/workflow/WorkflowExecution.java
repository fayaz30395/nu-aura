package com.nulogic.domain.workflow;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Workflow Execution - Tracks the execution of a workflow instance.
 * Links to the source entity (leave request, expense claim, etc.)
 *
 * <p>{@code submittedAt} is stamped by {@link TimeAuditingEntityListener} via
 * {@link TenantTimestamp} (tenant-zone aware). Status defaulting and reference
 * number generation are preserved in {@link #onCreate()} — see
 * {@code backend/docs/audit/prepersist-now-audit.md} row 22.</p>
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "workflow_executions")
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WorkflowExecution extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_definition_id", nullable = false)
    private WorkflowDefinition workflowDefinition;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private WorkflowDefinition.EntityType entityType;

    @Column(nullable = false)
    private UUID entityId;

    // Reference number for tracking
    @Column(unique = true)
    private String referenceNumber;

    @Column(nullable = false)
    private UUID requesterId;

    private String requesterName;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ExecutionStatus status;

    private int currentStepOrder;

    private UUID currentStepId;

    // Deadline based on SLA
    private LocalDateTime deadline;

    // When escalation is due
    private LocalDateTime escalationDueAt;

    // Priority for processing
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.NORMAL;

    // Summary/title for the request
    private String title;

    // Additional context stored as JSON
    @Column(columnDefinition = "TEXT")
    private String contextJson;

    // Total amount (for financial workflows)
    private java.math.BigDecimal amount;

    // Department/location for filtering
    private UUID departmentId;
    private UUID locationId;

    @TenantTimestamp
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;

    @OneToMany(mappedBy = "workflowExecution", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("executedAt ASC")
    @Builder.Default
    private List<StepExecution> stepExecutions = new ArrayList<>();

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    @PrePersist
    protected void onCreate() {
        // submittedAt stamped by TimeAuditingEntityListener via @TenantTimestamp
        if (status == null) status = ExecutionStatus.PENDING;
        if (referenceNumber == null) {
            referenceNumber = generateReferenceNumber();
        }
    }

    private String generateReferenceNumber() {
        String prefix = entityType != null ? entityType.name().substring(0, 3) : "WF";
        return prefix + "-" + System.currentTimeMillis() % 100000000;
    }

    public void addStepExecution(StepExecution stepExecution) {
        stepExecutions.add(stepExecution);
        stepExecution.setWorkflowExecution(this);
    }

    @Nullable
    public StepExecution getCurrentStepExecution() {
        return stepExecutions.stream()
                .filter(se -> se.getStatus() == StepExecution.StepStatus.PENDING)
                .findFirst()
                .orElse(null);
    }

    public boolean isCompleted() {
        return status == ExecutionStatus.APPROVED ||
                status == ExecutionStatus.REJECTED ||
                status == ExecutionStatus.CANCELLED;
    }

    public boolean canBeApproved() {
        return status == ExecutionStatus.PENDING || status == ExecutionStatus.IN_PROGRESS;
    }

    public void approve(LocalDateTime now) {
        this.status = ExecutionStatus.APPROVED;
        this.completedAt = now;
    }

    @SuppressWarnings("unused")
    public void reject(String reason, LocalDateTime now) {
        this.status = ExecutionStatus.REJECTED;
        this.completedAt = now;
    }

    public void cancel(String reason, LocalDateTime now) {
        this.status = ExecutionStatus.CANCELLED;
        this.cancelledAt = now;
        this.cancellationReason = reason;
    }

    public enum ExecutionStatus {
        DRAFT,           // Not yet submitted
        PENDING,         // Waiting for approval
        IN_PROGRESS,     // Being processed
        APPROVED,        // Fully approved
        REJECTED,        // Rejected at any step
        CANCELLED,       // Cancelled by requester
        ESCALATED,       // Escalated due to timeout
        ON_HOLD,         // Temporarily on hold
        RETURNED,        // Returned for modification
        EXPIRED          // Expired due to inaction
    }

    public enum Priority {
        LOW,
        NORMAL,
        HIGH,
        URGENT
    }
}
