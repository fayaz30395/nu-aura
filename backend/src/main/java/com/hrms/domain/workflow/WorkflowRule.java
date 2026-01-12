package com.hrms.domain.workflow;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Workflow Rule - Defines conditions for workflow selection and step behavior.
 * Supports complex rule expressions for dynamic workflow routing.
 */
@Entity
@Table(name = "workflow_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowRule extends TenantAware {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RuleType ruleType;

    // Entity type this rule applies to
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private WorkflowDefinition.EntityType entityType;

    // The rule expression (e.g., "amount > 10000 && department == 'SALES'")
    @Column(columnDefinition = "TEXT", nullable = false)
    private String ruleExpression;

    // Priority (higher number = higher priority, evaluated first)
    @Column(nullable = false)
    private int priority;

    // What happens when rule matches
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RuleAction action;

    // For ROUTE_TO_WORKFLOW action
    private UUID targetWorkflowId;

    // For ADD_APPROVER action
    private UUID additionalApproverId;
    private UUID additionalApproverRoleId;

    // For SKIP_STEP action
    private int skipStepOrder;

    // For SET_PRIORITY action
    @Enumerated(EnumType.STRING)
    private WorkflowExecution.Priority targetPriority;

    // For ADD_NOTIFICATION action
    @Column(columnDefinition = "TEXT")
    private String notificationRecipients;
    private String notificationTemplate;

    // Is rule active?
    @Column(nullable = false)
    private boolean isActive;

    // Effective dates
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    public enum RuleType {
        WORKFLOW_SELECTION,     // Determines which workflow to use
        STEP_CONDITION,         // Determines if a step should be executed
        APPROVER_ASSIGNMENT,    // Determines who the approver should be
        AUTO_ACTION,            // Auto-approve or auto-reject
        NOTIFICATION,           // Send additional notifications
        ESCALATION,             // Custom escalation rules
        PRIORITY,               // Set priority based on conditions
        VALIDATION              // Validate the request data
    }

    public enum RuleAction {
        ROUTE_TO_WORKFLOW,      // Route to specific workflow
        ADD_APPROVER,           // Add additional approver
        REMOVE_APPROVER,        // Remove an approver
        SKIP_STEP,              // Skip a step
        ADD_STEP,               // Add a step
        AUTO_APPROVE,           // Automatically approve
        AUTO_REJECT,            // Automatically reject
        SET_PRIORITY,           // Set priority level
        SEND_NOTIFICATION,      // Send notification
        ESCALATE,               // Escalate immediately
        HOLD,                   // Put on hold
        RETURN                  // Return for modification
    }

    @PrePersist
    protected void onCreate() {
        if (priority == 0) priority = 100;
    }

    public boolean isCurrentlyEffective() {
        if (!isActive) return false;
        LocalDateTime now = LocalDateTime.now();
        if (effectiveFrom != null && now.isBefore(effectiveFrom)) return false;
        if (effectiveTo != null && now.isAfter(effectiveTo)) return false;
        return true;
    }

    // Simple expression evaluator - in production, use SpEL or similar
    public boolean evaluate(Object context) {
        if (ruleExpression == null || ruleExpression.isEmpty()) {
            return true;
        }
        // Placeholder - actual implementation would use expression evaluation
        return true;
    }
}
