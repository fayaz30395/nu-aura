package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.StepExecution;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowExecution;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
public class WorkflowExecutionResponse {

    private UUID id;
    private UUID workflowDefinitionId;
    private String workflowName;
    private WorkflowDefinition.EntityType entityType;
    private UUID entityId;
    private String referenceNumber;
    private UUID requesterId;
    private String requesterName;
    private WorkflowExecution.ExecutionStatus status;
    private int currentStepOrder;
    private String currentStepName;
    private UUID currentAssigneeId;
    private String currentAssigneeName;
    private WorkflowExecution.Priority priority;
    private String title;
    private BigDecimal amount;
    private LocalDateTime deadline;
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private int totalSteps;
    private int completedSteps;
    private List<StepExecutionResponse> stepExecutions;

    public static WorkflowExecutionResponse from(WorkflowExecution execution) {
        StepExecution currentStep = execution.getCurrentStepExecution();

        return WorkflowExecutionResponse.builder()
                .id(execution.getId())
                .workflowDefinitionId(execution.getWorkflowDefinition() != null ?
                        execution.getWorkflowDefinition().getId() : null)
                .workflowName(execution.getWorkflowDefinition() != null ?
                        execution.getWorkflowDefinition().getName() : null)
                .entityType(execution.getEntityType())
                .entityId(execution.getEntityId())
                .referenceNumber(execution.getReferenceNumber())
                .requesterId(execution.getRequesterId())
                .requesterName(execution.getRequesterName())
                .status(execution.getStatus())
                .currentStepOrder(execution.getCurrentStepOrder())
                .currentStepName(currentStep != null ? currentStep.getStepName() : null)
                .currentAssigneeId(currentStep != null ? currentStep.getAssignedToUserId() : null)
                .currentAssigneeName(currentStep != null ? currentStep.getAssignedToUserName() : null)
                .priority(execution.getPriority())
                .title(execution.getTitle())
                .amount(execution.getAmount())
                .deadline(execution.getDeadline())
                .submittedAt(execution.getSubmittedAt())
                .completedAt(execution.getCompletedAt())
                .totalSteps(execution.getWorkflowDefinition() != null ?
                        execution.getWorkflowDefinition().getSteps().size() : 0)
                .completedSteps((int) execution.getStepExecutions().stream()
                        .filter(s -> s.getStatus() == StepExecution.StepStatus.APPROVED)
                        .count())
                .stepExecutions(execution.getStepExecutions() != null ?
                        execution.getStepExecutions().stream()
                        .map(StepExecutionResponse::from)
                        .collect(Collectors.toList()) : null)
                .build();
    }

    @Data
    @Builder
    public static class StepExecutionResponse {
        private UUID id;
        private int stepOrder;
        private String stepName;
        private StepExecution.StepStatus status;
        private UUID assignedToUserId;
        private String assignedToUserName;
        private UUID actionByUserId;
        private String actionByUserName;
        private StepExecution.ApprovalAction action;
        private String comments;
        private LocalDateTime assignedAt;
        private LocalDateTime executedAt;
        private Double timeTakenHours;
        private boolean escalated;
        private boolean delegated;

        public static StepExecutionResponse from(StepExecution stepExecution) {
            return StepExecutionResponse.builder()
                    .id(stepExecution.getId())
                    .stepOrder(stepExecution.getStepOrder())
                    .stepName(stepExecution.getStepName())
                    .status(stepExecution.getStatus())
                    .assignedToUserId(stepExecution.getAssignedToUserId())
                    .assignedToUserName(stepExecution.getAssignedToUserName())
                    .actionByUserId(stepExecution.getActionByUserId())
                    .actionByUserName(stepExecution.getActionByUserName())
                    .action(stepExecution.getAction())
                    .comments(stepExecution.getComments())
                    .assignedAt(stepExecution.getAssignedAt())
                    .executedAt(stepExecution.getExecutedAt())
                    .timeTakenHours(stepExecution.getTimeTakenHours())
                    .escalated(stepExecution.isEscalated())
                    .delegated(stepExecution.isDelegated())
                    .build();
        }
    }
}
