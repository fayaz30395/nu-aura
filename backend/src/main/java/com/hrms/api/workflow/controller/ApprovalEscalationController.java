package com.hrms.api.workflow.controller;

import com.hrms.api.workflow.dto.EscalationConfigRequest;
import com.hrms.api.workflow.dto.EscalationConfigResponse;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.user.Role;
import com.hrms.domain.workflow.ApprovalEscalationConfig;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.ApprovalEscalationConfigRepository;
import com.hrms.infrastructure.workflow.repository.WorkflowDefinitionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/escalation")
@RequiredArgsConstructor
@Tag(name = "Escalation Configuration", description = "Manage auto-escalation settings for approval workflows")
public class ApprovalEscalationController {

    private final ApprovalEscalationConfigRepository escalationConfigRepository;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @Operation(summary = "Get escalation config for a workflow")
    @GetMapping("/workflows/{workflowId}/config")
    @RequiresPermission(Permission.WORKFLOW_MANAGE)
    public ResponseEntity<EscalationConfigResponse> getConfig(@PathVariable UUID workflowId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        ApprovalEscalationConfig config = escalationConfigRepository
                .findByWorkflowDefinitionIdAndTenantId(workflowId, tenantId)
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

        // Verify workflow exists
        workflowDefinitionRepository.findByIdAndTenantId(workflowId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow definition not found"));

        ApprovalEscalationConfig config = escalationConfigRepository
                .findByWorkflowDefinitionIdAndTenantId(workflowId, tenantId)
                .orElseGet(() -> {
                    ApprovalEscalationConfig newConfig = new ApprovalEscalationConfig();
                    newConfig.setTenantId(tenantId);
                    newConfig.setWorkflowDefinitionId(workflowId);
                    return newConfig;
                });

        config.setTimeoutHours(request.getTimeoutHours());
        config.setEscalationType(request.getEscalationType());
        config.setFallbackRoleId(request.getFallbackRoleId());
        config.setFallbackUserId(request.getFallbackUserId());
        config.setMaxEscalations(request.getMaxEscalations());
        config.setNotifyOnEscalation(request.getNotifyOnEscalation());
        config.setIsActive(request.getIsActive());

        ApprovalEscalationConfig saved = escalationConfigRepository.save(config);
        log.info("Upserted escalation config for workflow {} in tenant {}", workflowId, tenantId);

        return ResponseEntity.ok(mapToResponse(saved, tenantId));
    }

    @Operation(summary = "Delete escalation config for a workflow")
    @DeleteMapping("/workflows/{workflowId}/config")
    @RequiresPermission(Permission.WORKFLOW_MANAGE)
    @Transactional
    public ResponseEntity<Void> deleteConfig(@PathVariable UUID workflowId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        int deleted = escalationConfigRepository
                .deleteByWorkflowDefinitionIdAndTenantId(workflowId, tenantId);

        if (deleted == 0) {
            throw new ResourceNotFoundException("Escalation config not found for workflow");
        }

        log.info("Deleted escalation config for workflow {} in tenant {}", workflowId, tenantId);
        return ResponseEntity.noContent().build();
    }

    private EscalationConfigResponse mapToResponse(ApprovalEscalationConfig config, UUID tenantId) {
        String workflowName = workflowDefinitionRepository
                .findByIdAndTenantId(config.getWorkflowDefinitionId(), tenantId)
                .map(WorkflowDefinition::getName)
                .orElse(null);

        String fallbackRoleName = null;
        if (config.getFallbackRoleId() != null) {
            fallbackRoleName = roleRepository.findById(config.getFallbackRoleId())
                    .map(Role::getName)
                    .orElse(null);
        }

        String fallbackUserName = null;
        if (config.getFallbackUserId() != null) {
            fallbackUserName = userRepository.findById(config.getFallbackUserId())
                    .map(u -> u.getFirstName() + " " + u.getLastName())
                    .orElse(null);
        }

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
                .createdAt(config.getCreatedAt() != null ? config.getCreatedAt().toInstant() : null)
                .updatedAt(config.getUpdatedAt() != null ? config.getUpdatedAt().toInstant() : null)
                .build();
    }
}
