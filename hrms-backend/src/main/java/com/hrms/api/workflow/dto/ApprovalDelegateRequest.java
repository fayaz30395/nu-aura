package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.WorkflowDefinition;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ApprovalDelegateRequest {

    @NotNull(message = "Delegate user ID is required")
    private UUID delegateId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private String reason;

    // Optional restrictions
    private WorkflowDefinition.EntityType entityType;
    private UUID workflowDefinitionId;
    private UUID departmentId;
    private BigDecimal maxApprovalAmount;

    private boolean canSubDelegate;
    private boolean notifyDelegatorOnAction = true;
    private boolean notifyDelegateOnAssignment = true;
    private int expiryNotificationDays = 1;
}
