package com.nulogic.api.document.controller;

import com.nulogic.api.document.dto.DocumentAccessDto;
import com.nulogic.api.document.dto.DocumentExpiryDto;
import com.nulogic.api.document.dto.GrantDocumentAccessRequest;
import com.nulogic.api.document.dto.SetDocumentExpiryRequest;
import com.nulogic.api.workflow.dto.WorkflowExecutionRequest;
import com.nulogic.api.workflow.dto.WorkflowExecutionResponse;
import com.nulogic.application.document.service.DocumentWorkflowService;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.document.DocumentAccess;
import com.nulogic.domain.document.DocumentExpiryTracking;
import com.nulogic.domain.workflow.WorkflowDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    private final DocumentWorkflowService documentWorkflowService;
    private final TenantTimeService tenantTimeService;

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

    // ===================== Access Control =====================

    @PostMapping("/{documentId}/access")
    @RequiresPermission(Permission.DOCUMENT_ACCESS_MANAGE)
    @Operation(summary = "Grant document access",
            description = "Grants view/edit/manage/approve access to a user, role, or department.")
    public ResponseEntity<DocumentAccessDto> grantAccess(
            @Parameter(description = "Document UUID") @PathVariable UUID documentId,
            @Valid @RequestBody GrantDocumentAccessRequest request) {
        DocumentAccess access = documentWorkflowService.grantAccess(
                documentId, request.getUserId(), request.getRoleId(), request.getDepartmentId(),
                request.getAccessLevel());
        return ResponseEntity.status(HttpStatus.CREATED).body(toAccessDto(access));
    }

    @DeleteMapping("/access/{accessId}")
    @RequiresPermission(Permission.DOCUMENT_ACCESS_MANAGE)
    @Operation(summary = "Revoke document access")
    public ResponseEntity<Void> revokeAccess(
            @Parameter(description = "Access grant UUID") @PathVariable UUID accessId) {
        documentWorkflowService.revokeAccess(accessId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}/access")
    @RequiresPermission(Permission.DOCUMENT_ACCESS_MANAGE)
    @Operation(summary = "List document access grants")
    public ResponseEntity<List<DocumentAccessDto>> listAccess(
            @Parameter(description = "Document UUID") @PathVariable UUID documentId) {
        List<DocumentAccessDto> grants = documentWorkflowService.listAccess(documentId).stream()
                .map(this::toAccessDto)
                .toList();
        return ResponseEntity.ok(grants);
    }

    // ===================== Expiry Tracking =====================

    @PutMapping("/{documentId}/expiry")
    @RequiresPermission(Permission.DOCUMENT_ACCESS_MANAGE)
    @Operation(summary = "Set document expiry",
            description = "Sets or updates a document's expiry date and reminder window.")
    public ResponseEntity<DocumentExpiryDto> setExpiry(
            @Parameter(description = "Document UUID") @PathVariable UUID documentId,
            @Valid @RequestBody SetDocumentExpiryRequest request) {
        DocumentExpiryTracking tracking = documentWorkflowService.setDocumentExpiry(
                documentId, request.getExpiryDate(), request.getReminderDaysBefore());
        return ResponseEntity.ok(toExpiryDto(tracking));
    }

    @GetMapping("/expiring")
    @RequiresPermission(Permission.DOCUMENT_ACCESS_MANAGE)
    @Operation(summary = "List documents expiring soon",
            description = "Documents whose expiry date falls within the given number of days (default 30).")
    public ResponseEntity<List<DocumentExpiryDto>> getExpiringDocuments(
            @RequestParam(defaultValue = "30") int days) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<DocumentExpiryDto> results = documentWorkflowService
                .getExpiringDocuments(tenantId, tenantTimeService.today(tenantId).plusDays(days)).stream()
                .map(this::toExpiryDto)
                .toList();
        return ResponseEntity.ok(results);
    }

    @GetMapping("/expired")
    @RequiresPermission(Permission.DOCUMENT_ACCESS_MANAGE)
    @Operation(summary = "List expired documents")
    public ResponseEntity<List<DocumentExpiryDto>> getExpiredDocuments() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<DocumentExpiryDto> results = documentWorkflowService.getExpiredDocuments(tenantId).stream()
                .map(this::toExpiryDto)
                .toList();
        return ResponseEntity.ok(results);
    }

    private DocumentExpiryDto toExpiryDto(DocumentExpiryTracking tracking) {
        return DocumentExpiryDto.builder()
                .id(tracking.getId())
                .documentId(tracking.getDocumentId())
                .expiryDate(tracking.getExpiryDate())
                .reminderDaysBefore(tracking.getReminderDaysBefore())
                .isNotified(tracking.getIsNotified())
                .notifiedAt(tracking.getNotifiedAt())
                .build();
    }

    private DocumentAccessDto toAccessDto(DocumentAccess access) {
        return DocumentAccessDto.builder()
                .id(access.getId())
                .documentId(access.getDocumentId())
                .userId(access.getUserId())
                .roleId(access.getRoleId())
                .departmentId(access.getDepartmentId())
                .accessLevel(access.getAccessLevel())
                .grantedBy(access.getGrantedBy())
                .grantedAt(access.getGrantedAt())
                .expiresAt(access.getExpiresAt())
                .isActive(access.getIsActive())
                .build();
    }
}
