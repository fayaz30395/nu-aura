package com.nulogic.api.workflow.controller;

import com.nulogic.api.workflow.dto.EscalationConfigRequest;
import com.nulogic.api.workflow.dto.EscalationConfigResponse;
import com.nulogic.application.workflow.service.ApprovalEscalationService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.workflow.ApprovalEscalationConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/escalation")
@RequiredArgsConstructor
@Tag(name = "Escalation Configuration", description = "Manage auto-escalation settings for approval workflows")
public class ApprovalEscalationController {

    private final ApprovalEscalationService approvalEscalationService;

    @Operation(summary = "Get escalation config for a workflow")
    @GetMapping("/workflows/{workflowId}/config")
    @RequiresPermission(Permission.WORKFLOW_MANAGE)
    public ResponseEntity<EscalationConfigResponse> getConfig(@PathVariable UUID workflowId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        ApprovalEscalationConfig config = approvalEscalationService
                .findConfigByWorkflow(workflowId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Escalation config not found for workflow"));

        return ResponseEntity.ok(mapToResponse(config, tenantId));
    }

    @Operation(summary = "Create or update escalation config for a workflow")
    @PutMapping("/workflows/{workflowId}/config")
    @RequiresPermission(Permission.WORKFLOW_MANAGE)
    public ResponseEntity<EscalationConfigResponse> upsertConfig(
            @PathVariable UUID workflowId,
            @Valid @RequestBody EscalationConfigRequest request) {

        UUID tenantId = SecurityContext.getCurrentTenantId();

        ApprovalEscalationConfig saved = approvalEscalationService.upsertConfig(workflowId, tenantId, request);
        log.info("Upserted escalation config for workflow {} in tenant {}", workflowId, tenantId);

        return ResponseEntity.ok(mapToResponse(saved, tenantId));
    }

    @Operation(summary = "Delete escalation config for a workflow")
    @DeleteMapping("/workflows/{workflowId}/config")
    @RequiresPermission(Permission.WORKFLOW_MANAGE)
    public ResponseEntity<Void> deleteConfig(@PathVariable UUID workflowId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        int deleted = approvalEscalationService.deleteEscalationConfig(workflowId, tenantId);

        if (deleted == 0) {
            throw new ResourceNotFoundException("Escalation config not found for workflow");
        }

        log.info("Deleted escalation config for workflow {} in tenant {}", workflowId, tenantId);
        return ResponseEntity.noContent().build();
    }

    private EscalationConfigResponse mapToResponse(ApprovalEscalationConfig config, UUID tenantId) {
        String workflowName = approvalEscalationService
                .findWorkflowName(config.getWorkflowDefinitionId(), tenantId)
                .orElse(null);

        String fallbackRoleName = config.getFallbackRoleId() != null
                ? approvalEscalationService.findRoleName(config.getFallbackRoleId())
                  .orElse(null)
                : null;

        String fallbackUserName = config.getFallbackUserId() != null
                ? approvalEscalationService.findUserFullName(config.getFallbackUserId())
                  .orElse(null)
                : null;

        return EscalationConfigResponse.builder()
                .id(config.getId())
                .workflowDefinitionId(config.getWorkflowDefinitionId())
                .workflowName(workflowName)
                .timeoutHours(config.getTimeoutHours())
                .escalationType(config.getEscalationType())
                .fallbackRoleId(config.getFallbackRoleId())
                .fallbackRoleName(fallbackRoleName)
                .fallbackUserId(config.getFallbackUserId())
                .fallbackUserName(fallbackUserName)
                .maxEscalations(config.getMaxEscalations())
                .notifyOnEscalation(config.getNotifyOnEscalation())
                .isActive(config.getIsActive())
                .createdAt(config.getCreatedAt() != null ? config.getCreatedAt().toInstant(java.time.ZoneOffset.UTC) : null)
                .updatedAt(config.getUpdatedAt() != null ? config.getUpdatedAt().toInstant(java.time.ZoneOffset.UTC) : null)
                .build();
    }
}
