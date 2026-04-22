package com.hrms.domain.workflow;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

/**
 * Approval Step - Defines a single step in a workflow approval chain.
 * Supports various approver types: specific user, role, reporting manager, etc.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "approval_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalStep extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_definition_id", nullable = false)
    private WorkflowDefinition workflowDefinition;

    @Column(nullable = false)
    private int stepOrder;

    @Column(nullable = false)
    private String stepName;

    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ApproverType approverType;

    // For SPECIFIC_USER type
    private UUID specificUserId;

    // For ROLE type
    private UUID roleId;
    private String roleName;

    // For DEPARTMENT_HEAD type
    private UUID departmentId;

    // For HIERARCHY type - levels above the requester
    private int hierarchyLevel;

    // For DYNAMIC type - expression to determine approver
    private String approverExpression;

    // Minimum approvals needed at this step (for parallel approvals)
    @Builder.Default
    private int minApprovals = 1;

    // Whether this step can be skipped
    private boolean isOptional;

    // Conditions for this step to be applicable
    private String condition;

    // SLA for this step
    private int slaHours;

    // Escalation settings
    private boolean escalationEnabled;
    private int escalateAfterHours;
    private UUID escalateToUserId;
    private UUID escalateToRoleId;

    // Auto-approval settings
    private boolean autoApproveOnTimeout;
    private boolean autoRejectOnTimeout;

    // Notification templates
    private String notificationTemplate;
    private String reminderTemplate;
    private String escalationTemplate;

    // Allow delegation at this step
    private boolean delegationAllowed;

    // Allow comments/attachments
    private boolean commentsRequired;
    private boolean attachmentsAllowed;

    public boolean isApplicable(Object context) {
        if (condition == null || condition.isEmpty()) {
            return true;
        }
        // Condition evaluation would be done by WorkflowEngine
        return true;
    }

    public enum ApproverType {
        SPECIFIC_USER,       // A specific user
        ROLE,                // Anyone with a specific role
        REPORTING_MANAGER,   // Direct reporting manager
        SKIP_LEVEL_MANAGER,  // Manager's manager
        DEPARTMENT_HEAD,     // Head of department
        HR_MANAGER,          // HR Manager
        FINANCE_MANAGER,     // Finance Manager
        CEO,                 // CEO/Top management
        CUSTOM_HIERARCHY,    // Custom hierarchy level
        DYNAMIC,             // Determined at runtime by expression
        COMMITTEE,           // Multiple approvers (committee)
        ANY_OF_ROLE          // Any one person with the role
    }
}
