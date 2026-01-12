package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.ApprovalStep;
import com.hrms.domain.workflow.WorkflowDefinition;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
public class WorkflowDefinitionResponse {

    private UUID id;
    private String name;
    private String description;
    private WorkflowDefinition.EntityType entityType;
    private WorkflowDefinition.WorkflowType workflowType;
    private int version;
    private boolean isActive;
    private boolean isDefault;
    private UUID departmentId;
    private UUID locationId;
    private String applicableGrades;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    private int defaultSlaHours;
    private boolean escalationEnabled;
    private int escalationAfterHours;
    private boolean notifyOnSubmission;
    private boolean notifyOnApproval;
    private boolean notifyOnRejection;
    private boolean notifyOnEscalation;
    private boolean allowParallelApproval;
    private boolean autoApproveEnabled;
    private String autoApproveCondition;
    private boolean skipLevelAllowed;
    private int totalSteps;
    private List<ApprovalStepResponse> steps;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WorkflowDefinitionResponse from(WorkflowDefinition definition) {
        return WorkflowDefinitionResponse.builder()
                .id(definition.getId())
                .name(definition.getName())
                .description(definition.getDescription())
                .entityType(definition.getEntityType())
                .workflowType(definition.getWorkflowType())
                .version(definition.getWorkflowVersion())
                .isActive(definition.isActive())
                .isDefault(definition.isDefault())
                .departmentId(definition.getDepartmentId())
                .locationId(definition.getLocationId())
                .applicableGrades(definition.getApplicableGrades())
                .minAmount(definition.getMinAmount())
                .maxAmount(definition.getMaxAmount())
                .defaultSlaHours(definition.getDefaultSlaHours())
                .escalationEnabled(definition.isEscalationEnabled())
                .escalationAfterHours(definition.getEscalationAfterHours())
                .notifyOnSubmission(definition.isNotifyOnSubmission())
                .notifyOnApproval(definition.isNotifyOnApproval())
                .notifyOnRejection(definition.isNotifyOnRejection())
                .notifyOnEscalation(definition.isNotifyOnEscalation())
                .allowParallelApproval(definition.isAllowParallelApproval())
                .autoApproveEnabled(definition.isAutoApproveEnabled())
                .autoApproveCondition(definition.getAutoApproveCondition())
                .skipLevelAllowed(definition.isSkipLevelAllowed())
                .totalSteps(definition.getSteps() != null ? definition.getSteps().size() : 0)
                .steps(definition.getSteps() != null ?
                       definition.getSteps().stream()
                               .map(ApprovalStepResponse::from)
                               .collect(Collectors.toList()) : null)
                .createdAt(definition.getCreatedAt())
                .updatedAt(definition.getUpdatedAt())
                .build();
    }

    @Data
    @Builder
    public static class ApprovalStepResponse {
        private UUID id;
        private int stepOrder;
        private String stepName;
        private String description;
        private ApprovalStep.ApproverType approverType;
        private UUID specificUserId;
        private UUID roleId;
        private String roleName;
        private UUID departmentId;
        private int hierarchyLevel;
        private int minApprovals;
        private boolean isOptional;
        private String condition;
        private int slaHours;
        private boolean escalationEnabled;
        private int escalateAfterHours;
        private boolean delegationAllowed;
        private boolean commentsRequired;
        private boolean attachmentsAllowed;

        public static ApprovalStepResponse from(ApprovalStep step) {
            return ApprovalStepResponse.builder()
                    .id(step.getId())
                    .stepOrder(step.getStepOrder())
                    .stepName(step.getStepName())
                    .description(step.getDescription())
                    .approverType(step.getApproverType())
                    .specificUserId(step.getSpecificUserId())
                    .roleId(step.getRoleId())
                    .roleName(step.getRoleName())
                    .departmentId(step.getDepartmentId())
                    .hierarchyLevel(step.getHierarchyLevel())
                    .minApprovals(step.getMinApprovals())
                    .isOptional(step.isOptional())
                    .condition(step.getCondition())
                    .slaHours(step.getSlaHours())
                    .escalationEnabled(step.isEscalationEnabled())
                    .escalateAfterHours(step.getEscalateAfterHours())
                    .delegationAllowed(step.isDelegationAllowed())
                    .commentsRequired(step.isCommentsRequired())
                    .attachmentsAllowed(step.isAttachmentsAllowed())
                    .build();
        }
    }
}
