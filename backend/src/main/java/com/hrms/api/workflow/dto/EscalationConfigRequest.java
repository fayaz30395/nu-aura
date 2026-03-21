package com.hrms.api.workflow.dto;

import com.hrms.domain.user.EscalationType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EscalationConfigRequest {
    @NotNull(message = "Timeout hours is required")
    @Min(value = 1, message = "Timeout must be at least 1 hour")
    private Integer timeoutHours = 48;

    @NotNull(message = "Escalation type is required")
    private EscalationType escalationType = EscalationType.SKIP_LEVEL_MANAGER;

    private UUID fallbackRoleId;

    private UUID fallbackUserId;

    @Min(value = 1, message = "Max escalations must be at least 1")
    @Max(value = 10, message = "Max escalations cannot exceed 10")
    private Integer maxEscalations = 2;

    private Boolean notifyOnEscalation = true;

    private Boolean isActive = true;
}
