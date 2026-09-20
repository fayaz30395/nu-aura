package com.nulogic.api.document.controller;

import com.nulogic.api.workflow.dto.WorkflowExecutionRequest;
import com.nulogic.api.workflow.dto.WorkflowExecutionResponse;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.workflow.WorkflowDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for document workflow and access management.
 *
 * <p>Approval routes through the generic {@link WorkflowService} engine (entity type
 * {@link WorkflowDefinition.EntityType#DOCUMENT_REQUEST}) rather than the dedicated
 * {@code DocumentApprovalWorkflow}/{@code DocumentApprovalTask} tables — those, and
 * {@code DocumentWorkflowService}'s initiate/approve/reject methods, are now dead code
 * pending a future cleanup ticket. Approve/reject/pending-list already exist on
 * {@code WorkflowController} — this controller only wires the initiation.</p>
 */
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Document approval, access control, and expiry management")
public class DocumentController {

    private final WorkflowService workflowService;

    @PostMapping("/{documentId}/request-approval")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    @Operation(summary = "Request document approval",
            description = "Starts an approval workflow for the document via the generic workflow engine.")
    public ResponseEntity<WorkflowExecutionResponse> requestApproval(
            @Parameter(description = "Document UUID") @PathVariable UUID documentId,
            @RequestParam(required = false) String title) {
        WorkflowExecutionRequest request = new WorkflowExecutionRequest();
        request.setEntityType(WorkflowDefinition.EntityType.DOCUMENT_REQUEST);
        request.setEntityId(documentId);
        request.setTitle(title != null ? title : "Document approval");
        return ResponseEntity.ok(workflowService.startWorkflow(request));
    }
}
