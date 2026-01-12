package com.hrms.api.workflow.controller;

import com.hrms.api.workflow.dto.*;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.workflow.WorkflowDefinition;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    // ==================== Workflow Definition Endpoints ====================

    @PostMapping("/definitions")
    @RequiresPermission("WORKFLOW:MANAGE")
    public ResponseEntity<WorkflowDefinitionResponse> createWorkflowDefinition(
            @Valid @RequestBody WorkflowDefinitionRequest request) {
        return ResponseEntity.ok(workflowService.createWorkflowDefinition(request));
    }

    @GetMapping("/definitions/{id}")
    @RequiresPermission("WORKFLOW:VIEW")
    public ResponseEntity<WorkflowDefinitionResponse> getWorkflowDefinition(@PathVariable UUID id) {
        return ResponseEntity.ok(workflowService.getWorkflowDefinition(id));
    }

    @GetMapping("/definitions")
    @RequiresPermission("WORKFLOW:VIEW")
    public ResponseEntity<Page<WorkflowDefinitionResponse>> getAllWorkflowDefinitions(Pageable pageable) {
        return ResponseEntity.ok(workflowService.getAllWorkflowDefinitions(pageable));
    }

    @GetMapping("/definitions/entity-type/{entityType}")
    @RequiresPermission("WORKFLOW:VIEW")
    public ResponseEntity<List<WorkflowDefinitionResponse>> getWorkflowsByEntityType(
            @PathVariable WorkflowDefinition.EntityType entityType) {
        return ResponseEntity.ok(workflowService.getWorkflowsByEntityType(entityType));
    }

    @PutMapping("/definitions/{id}")
    @RequiresPermission("WORKFLOW:MANAGE")
    public ResponseEntity<WorkflowDefinitionResponse> updateWorkflowDefinition(
            @PathVariable UUID id,
            @Valid @RequestBody WorkflowDefinitionRequest request) {
        return ResponseEntity.ok(workflowService.updateWorkflowDefinition(id, request));
    }

    @DeleteMapping("/definitions/{id}")
    @RequiresPermission("WORKFLOW:MANAGE")
    public ResponseEntity<Void> deactivateWorkflowDefinition(@PathVariable UUID id) {
        workflowService.deactivateWorkflowDefinition(id);
        return ResponseEntity.ok().build();
    }

    // ==================== Workflow Execution Endpoints ====================

    @PostMapping("/executions")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<WorkflowExecutionResponse> startWorkflow(
            @Valid @RequestBody WorkflowExecutionRequest request) {
        return ResponseEntity.ok(workflowService.startWorkflow(request));
    }

    @GetMapping("/executions/{id}")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    public ResponseEntity<WorkflowExecutionResponse> getWorkflowExecution(@PathVariable UUID id) {
        return ResponseEntity.ok(workflowService.getWorkflowExecution(id));
    }

    @GetMapping("/executions/reference/{referenceNumber}")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    public ResponseEntity<WorkflowExecutionResponse> getWorkflowByReferenceNumber(
            @PathVariable String referenceNumber) {
        return ResponseEntity.ok(workflowService.getWorkflowByReferenceNumber(referenceNumber));
    }

    @PostMapping("/executions/{id}/action")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<WorkflowExecutionResponse> processApprovalAction(
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalActionRequest request) {
        return ResponseEntity.ok(workflowService.processApprovalAction(id, request));
    }

    @PostMapping("/executions/{id}/approve")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<WorkflowExecutionResponse> approveExecution(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setAction(com.hrms.domain.workflow.StepExecution.ApprovalAction.APPROVE);
        request.setComments(body != null ? body.get("comments") : null);
        return ResponseEntity.ok(workflowService.processApprovalAction(id, request));
    }

    @PostMapping("/executions/{id}/reject")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<WorkflowExecutionResponse> rejectExecution(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setAction(com.hrms.domain.workflow.StepExecution.ApprovalAction.REJECT);
        request.setComments(body.get("comments"));
        return ResponseEntity.ok(workflowService.processApprovalAction(id, request));
    }

    @PostMapping("/executions/{id}/return")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<WorkflowExecutionResponse> returnForModification(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        ApprovalActionRequest request = new ApprovalActionRequest();
        request.setAction(com.hrms.domain.workflow.StepExecution.ApprovalAction.RETURN_FOR_MODIFICATION);
        request.setComments(body.get("comments"));
        return ResponseEntity.ok(workflowService.processApprovalAction(id, request));
    }

    @PostMapping("/executions/{id}/cancel")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<Void> cancelWorkflow(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        workflowService.cancelWorkflow(id, body.get("reason"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/my-pending-approvals")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    public ResponseEntity<List<WorkflowExecutionResponse>> getMyPendingApprovals() {
        return ResponseEntity.ok(workflowService.getMyPendingApprovals());
    }

    @GetMapping("/my-requests")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    public ResponseEntity<List<WorkflowExecutionResponse>> getMyRequests() {
        return ResponseEntity.ok(workflowService.getMyRequests());
    }

    @GetMapping("/pending-approvals/user/{userId}")
    @RequiresPermission("WORKFLOW:VIEW")
    public ResponseEntity<List<WorkflowExecutionResponse>> getPendingApprovalsForUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(workflowService.getPendingApprovalsForUser(userId));
    }

    // ==================== Delegation Endpoints ====================

    @PostMapping("/delegations")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<ApprovalDelegateResponse> createDelegation(
            @Valid @RequestBody ApprovalDelegateRequest request) {
        return ResponseEntity.ok(workflowService.createDelegation(request));
    }

    @GetMapping("/delegations/my")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    public ResponseEntity<List<ApprovalDelegateResponse>> getMyDelegations() {
        return ResponseEntity.ok(workflowService.getMyDelegations());
    }

    @GetMapping("/delegations/to-me")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    public ResponseEntity<List<ApprovalDelegateResponse>> getDelegationsToMe() {
        return ResponseEntity.ok(workflowService.getDelegationsToMe());
    }

    @PostMapping("/delegations/{id}/revoke")
    @RequiresPermission(Permission.WORKFLOW_EXECUTE)
    public ResponseEntity<Void> revokeDelegation(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        workflowService.revokeDelegation(id, body.get("reason"));
        return ResponseEntity.ok().build();
    }

    // ==================== Dashboard & Analytics ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.WORKFLOW_VIEW)
    public ResponseEntity<Map<String, Object>> getWorkflowDashboard() {
        return ResponseEntity.ok(workflowService.getWorkflowDashboard());
    }

    @GetMapping("/executions/overdue")
    @RequiresPermission("WORKFLOW:VIEW")
    public ResponseEntity<List<WorkflowExecutionResponse>> getOverdueExecutions() {
        return ResponseEntity.ok(workflowService.getOverdueExecutions());
    }

    @GetMapping("/executions/escalation-due")
    @RequiresPermission("WORKFLOW:VIEW")
    public ResponseEntity<List<WorkflowExecutionResponse>> getExecutionsDueForEscalation() {
        return ResponseEntity.ok(workflowService.getExecutionsDueForEscalation());
    }
}
