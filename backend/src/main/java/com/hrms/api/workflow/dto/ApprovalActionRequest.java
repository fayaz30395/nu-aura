package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.StepExecution;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ApprovalActionRequest {

    @NotNull(message = "Action is required")
    private StepExecution.ApprovalAction action;

    private String comments;

    // For delegation
    private UUID delegateToUserId;

    // For attachments (comma-separated file IDs or paths)
    private String attachments;
}
