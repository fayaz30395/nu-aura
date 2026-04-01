package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.ApprovalStep;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ApprovalStepRequest {

    @Min(value = 1, message = "Step order must be at least 1")
    private int stepOrder;

    @NotBlank(message = "Step name is required")
    private String stepName;

    private String description;

    @NotNull(message = "Approver type is required")
    private ApprovalStep.ApproverType approverType;

    private UUID specificUserId;
    private UUID roleId;
    private String roleName;
    private UUID departmentId;
    private int hierarchyLevel;
    private String approverExpression;

    private int minApprovals = 1;
    private boolean isOptional;
    private String condition;

    private int slaHours;
    private boolean escalationEnabled;
    private int escalateAfterHours;
    private UUID escalateToUserId;
    private UUID escalateToRoleId;

    private boolean autoApproveOnTimeout;
    private boolean autoRejectOnTimeout;

    private String notificationTemplate;
    private String reminderTemplate;
    private String escalationTemplate;

    private boolean delegationAllowed = true;
    private boolean commentsRequired;
    private boolean attachmentsAllowed = true;
}
