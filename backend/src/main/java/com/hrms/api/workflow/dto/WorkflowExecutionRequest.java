package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.domain.workflow.WorkflowExecution;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class WorkflowExecutionRequest {

    @NotNull(message = "Entity type is required")
    private WorkflowDefinition.EntityType entityType;

    @NotNull(message = "Entity ID is required")
    private UUID entityId;

    private String title;
    private String contextJson;
    private BigDecimal amount;
    private UUID departmentId;
    private UUID locationId;
    private WorkflowExecution.Priority priority;

    // Optional - if not provided, system will select appropriate workflow
    private UUID workflowDefinitionId;
}
