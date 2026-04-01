package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.WorkflowDefinition;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class WorkflowDefinitionRequest {

    @NotBlank(message = "Workflow name is required")
    private String name;

    private String description;

    @NotNull(message = "Entity type is required")
    private WorkflowDefinition.EntityType entityType;

    @NotNull(message = "Workflow type is required")
    private WorkflowDefinition.WorkflowType workflowType;

    private UUID departmentId;
    private UUID locationId;
    private String applicableGrades;

    private BigDecimal minAmount;
    private BigDecimal maxAmount;

    private int defaultSlaHours;
    private boolean escalationEnabled;
    private int escalationAfterHours;

    private boolean notifyOnSubmission = true;
    private boolean notifyOnApproval = true;
    private boolean notifyOnRejection = true;
    private boolean notifyOnEscalation = true;

    private boolean allowParallelApproval;
    private boolean autoApproveEnabled;
    private String autoApproveCondition;
    private boolean skipLevelAllowed;
    private boolean isDefault;

    @Valid
    private List<ApprovalStepRequest> steps;
}
