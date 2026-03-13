package com.hrms.domain.workflow;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Workflow Definition - Defines a reusable workflow template for approvals.
 * Supports various entity types (Leave, Expense, Travel, Loan, etc.)
 */
@Entity
@Table(name = "workflow_definitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WorkflowDefinition extends TenantAware {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EntityType entityType;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private WorkflowType workflowType;

    @Column(nullable = false)
    private int workflowVersion;

    @Column(nullable = false)
    private boolean isActive;

    @Column(nullable = false)
    private boolean isDefault;

    // Department-specific workflow (null means applies to all)
    private UUID departmentId;

    // Location-specific workflow
    private UUID locationId;

    // Employee grade/level specific
    private String applicableGrades;

    // Minimum amount threshold for this workflow (for financial workflows)
    private java.math.BigDecimal minAmount;
    private java.math.BigDecimal maxAmount;

    // SLA settings
    private int defaultSlaHours;
    private boolean escalationEnabled;
    private int escalationAfterHours;

    // Notification settings
    private boolean notifyOnSubmission;
    private boolean notifyOnApproval;
    private boolean notifyOnRejection;
    private boolean notifyOnEscalation;

    // Allow parallel approvals at same level
    private boolean allowParallelApproval;

    // Auto-approve settings
    private boolean autoApproveEnabled;
    private String autoApproveCondition;

    // Skip level approval
    private boolean skipLevelAllowed;

    @OneToMany(mappedBy = "workflowDefinition", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepOrder ASC")
    @Builder.Default
    private List<ApprovalStep> steps = new ArrayList<>();

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    public enum EntityType {
        LEAVE_REQUEST,
        EXPENSE_CLAIM,
        TRAVEL_REQUEST,
        LOAN_REQUEST,
        ASSET_REQUEST,
        TIMESHEET,
        RESIGNATION,
        SALARY_REVISION,
        PROMOTION,
        TRANSFER,
        ONBOARDING,
        OFFBOARDING,
        DOCUMENT_REQUEST,
        POLICY_ACKNOWLEDGMENT,
        TRAINING_REQUEST,
        REIMBURSEMENT,
        OVERTIME,
        SHIFT_CHANGE,
        WORK_FROM_HOME,
        RECRUITMENT_OFFER,
        CUSTOM
    }

    public enum WorkflowType {
        SEQUENTIAL,      // One after another
        PARALLEL,        // All at once, need all approvals
        CONDITIONAL,     // Based on conditions/rules
        HIERARCHICAL,    // Based on reporting structure
        HYBRID           // Mix of above
    }

    @PrePersist
    protected void onCreate() {
        if (workflowVersion == 0) workflowVersion = 1;
    }

    public void addStep(ApprovalStep step) {
        steps.add(step);
        step.setWorkflowDefinition(this);
    }

    public void removeStep(ApprovalStep step) {
        steps.remove(step);
        step.setWorkflowDefinition(null);
    }

    public ApprovalStep getNextStep(int currentStepOrder) {
        return steps.stream()
                .filter(s -> s.getStepOrder() > currentStepOrder)
                .findFirst()
                .orElse(null);
    }

    public boolean isLastStep(int stepOrder) {
        return steps.stream().noneMatch(s -> s.getStepOrder() > stepOrder);
    }
}
