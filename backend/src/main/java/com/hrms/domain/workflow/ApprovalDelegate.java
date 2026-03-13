package com.hrms.domain.workflow;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Approval Delegate - Allows users to delegate their approval authority to others.
 * Supports time-bound delegation and entity-type specific delegation.
 */
@Entity
@Table(name = "approval_delegates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalDelegate extends TenantAware {

    // Who is delegating
    @Column(nullable = false)
    private UUID delegatorId;

    private String delegatorName;

    // Who is receiving the delegation
    @Column(nullable = false)
    private UUID delegateId;

    private String delegateName;

    // Delegation period
    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    // Reason for delegation
    private String reason;

    // Is it currently active?
    @Column(nullable = false)
    private boolean isActive;

    // Entity type restrictions (null means all types)
    @Enumerated(EnumType.STRING)
    private WorkflowDefinition.EntityType entityType;

    // Workflow definition restriction (null means all workflows)
    private UUID workflowDefinitionId;

    // Department restriction
    private UUID departmentId;

    // Maximum amount the delegate can approve (for financial workflows)
    private java.math.BigDecimal maxApprovalAmount;

    // Can the delegate further delegate?
    private boolean canSubDelegate;

    // Notification preferences
    private boolean notifyDelegatorOnAction;
    private boolean notifyDelegateOnAssignment;

    // Auto-expire notification days before
    private int expiryNotificationDays;

    // Revoked info
    private boolean revoked;
    private LocalDateTime revokedAt;
    private UUID revokedBy;
    private String revocationReason;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    @PrePersist
    protected void onCreate() {
        if (!isActive) isActive = true;
    }

    public boolean isValidForDate(LocalDate date) {
        if (!isActive || revoked) return false;
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    public boolean isValidForEntityType(WorkflowDefinition.EntityType type) {
        return entityType == null || entityType == type;
    }

    public boolean isValidForAmount(java.math.BigDecimal amount) {
        if (maxApprovalAmount == null) return true;
        return amount == null || amount.compareTo(maxApprovalAmount) <= 0;
    }

    public boolean isValidForWorkflow(UUID workflowId) {
        return workflowDefinitionId == null || workflowDefinitionId.equals(workflowId);
    }

    public boolean isCurrentlyValid() {
        return isValidForDate(LocalDate.now());
    }

    public void revoke(UUID revokedByUserId, String reason) {
        this.revoked = true;
        this.isActive = false;
        this.revokedAt = LocalDateTime.now();
        this.revokedBy = revokedByUserId;
        this.revocationReason = reason;
    }

    public void activate() {
        if (!revoked) {
            this.isActive = true;
        }
    }

    public void deactivate() {
        this.isActive = false;
    }
}
