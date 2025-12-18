package com.hrms.api.workflow.dto;

import com.hrms.domain.workflow.ApprovalDelegate;
import com.hrms.domain.workflow.WorkflowDefinition;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ApprovalDelegateResponse {

    private UUID id;
    private UUID delegatorId;
    private String delegatorName;
    private UUID delegateId;
    private String delegateName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private boolean isActive;
    private WorkflowDefinition.EntityType entityType;
    private UUID workflowDefinitionId;
    private UUID departmentId;
    private BigDecimal maxApprovalAmount;
    private boolean canSubDelegate;
    private boolean revoked;
    private LocalDateTime revokedAt;
    private String revocationReason;
    private LocalDateTime createdAt;
    private boolean isCurrentlyValid;

    public static ApprovalDelegateResponse from(ApprovalDelegate delegate) {
        return ApprovalDelegateResponse.builder()
                .id(delegate.getId())
                .delegatorId(delegate.getDelegatorId())
                .delegatorName(delegate.getDelegatorName())
                .delegateId(delegate.getDelegateId())
                .delegateName(delegate.getDelegateName())
                .startDate(delegate.getStartDate())
                .endDate(delegate.getEndDate())
                .reason(delegate.getReason())
                .isActive(delegate.isActive())
                .entityType(delegate.getEntityType())
                .workflowDefinitionId(delegate.getWorkflowDefinitionId())
                .departmentId(delegate.getDepartmentId())
                .maxApprovalAmount(delegate.getMaxApprovalAmount())
                .canSubDelegate(delegate.isCanSubDelegate())
                .revoked(delegate.isRevoked())
                .revokedAt(delegate.getRevokedAt())
                .revocationReason(delegate.getRevocationReason())
                .createdAt(delegate.getCreatedAt())
                .isCurrentlyValid(delegate.isCurrentlyValid())
                .build();
    }
}
