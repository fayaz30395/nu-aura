package com.hrms.api.workflow.dto;

import com.hrms.domain.user.EscalationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EscalationConfigResponse {
    private UUID id;
    private UUID workflowDefinitionId;
    private String workflowName;
    private Integer timeoutHours;
    private EscalationType escalationType;
    private UUID fallbackRoleId;
    private String fallbackRoleName;
    private UUID fallbackUserId;
    private String fallbackUserName;
    private Integer maxEscalations;
    private Boolean notifyOnEscalation;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
