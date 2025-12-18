package com.hrms.api.esignature.controller;

import com.hrms.api.esignature.dto.*;
import com.hrms.application.esignature.service.ESignatureService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.esignature.SignatureRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/esignature")
@RequiredArgsConstructor
public class ESignatureController {

    private final ESignatureService eSignatureService;

    // ==================== Signature Request Endpoints ====================

    @RequiresPermission(DOCUMENT_UPLOAD)
    @PostMapping("/requests")
    public ResponseEntity<SignatureRequestResponse> createSignatureRequest(
            @RequestBody SignatureRequestRequest request,
            @RequestParam UUID createdBy) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eSignatureService.createSignatureRequest(request, createdBy));
    }

    @RequiresPermission(DOCUMENT_UPLOAD)
    @PutMapping("/requests/{id}")
    public ResponseEntity<SignatureRequestResponse> updateSignatureRequest(
            @PathVariable UUID id,
            @RequestBody SignatureRequestRequest request) {
        return ResponseEntity.ok(eSignatureService.updateSignatureRequest(id, request));
    }

    @RequiresPermission(DOCUMENT_UPLOAD)
    @PatchMapping("/requests/{id}/send")
    public ResponseEntity<SignatureRequestResponse> sendForSignature(@PathVariable UUID id) {
        return ResponseEntity.ok(eSignatureService.sendForSignature(id));
    }

    @RequiresPermission(DOCUMENT_UPLOAD)
    @PatchMapping("/requests/{id}/cancel")
    public ResponseEntity<SignatureRequestResponse> cancelSignatureRequest(
            @PathVariable UUID id,
            @RequestParam UUID cancelledBy,
            @RequestParam String reason) {
        return ResponseEntity.ok(eSignatureService.cancelSignatureRequest(id, cancelledBy, reason));
    }

    @RequiresPermission({DOCUMENT_VIEW, EMPLOYEE_VIEW_SELF})
    @GetMapping("/requests/{id}")
    public ResponseEntity<SignatureRequestResponse> getSignatureRequestById(@PathVariable UUID id) {
        return ResponseEntity.ok(eSignatureService.getSignatureRequestById(id));
    }

    @RequiresPermission({DOCUMENT_VIEW, EMPLOYEE_VIEW_SELF})
    @GetMapping("/requests")
    public ResponseEntity<Page<SignatureRequestResponse>> getAllSignatureRequests(Pageable pageable) {
        return ResponseEntity.ok(eSignatureService.getAllSignatureRequests(pageable));
    }

    @RequiresPermission({DOCUMENT_VIEW, EMPLOYEE_VIEW_SELF})
    @GetMapping("/requests/creator/{creatorId}")
    public ResponseEntity<List<SignatureRequestResponse>> getSignatureRequestsByCreator(
            @PathVariable UUID creatorId) {
        return ResponseEntity.ok(eSignatureService.getSignatureRequestsByCreator(creatorId));
    }

    @RequiresPermission({DOCUMENT_VIEW, EMPLOYEE_VIEW_SELF})
    @GetMapping("/requests/status/{status}")
    public ResponseEntity<List<SignatureRequestResponse>> getSignatureRequestsByStatus(
            @PathVariable SignatureRequest.SignatureStatus status) {
        return ResponseEntity.ok(eSignatureService.getSignatureRequestsByStatus(status));
    }

    @RequiresPermission({DOCUMENT_VIEW, EMPLOYEE_VIEW_SELF})
    @GetMapping("/requests/templates")
    public ResponseEntity<List<SignatureRequestResponse>> getTemplates() {
        return ResponseEntity.ok(eSignatureService.getTemplates());
    }

    @RequiresPermission(DOCUMENT_UPLOAD)
    @DeleteMapping("/requests/{id}")
    public ResponseEntity<Void> deleteSignatureRequest(@PathVariable UUID id) {
        eSignatureService.deleteSignatureRequest(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Signature Approval Endpoints ====================

    @RequiresPermission(DOCUMENT_UPLOAD)
    @PostMapping("/requests/{requestId}/signers")
    public ResponseEntity<SignatureApprovalResponse> addSigner(
            @PathVariable UUID requestId,
            @RequestBody SignatureApprovalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eSignatureService.addSigner(requestId, request));
    }

    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    @PostMapping("/approvals/{approvalId}/sign")
    public ResponseEntity<SignatureApprovalResponse> signDocument(
            @PathVariable UUID approvalId,
            @RequestBody SignDocumentRequest request) {
        return ResponseEntity.ok(eSignatureService.signDocument(approvalId, request));
    }

    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    @PostMapping("/approvals/{approvalId}/decline")
    public ResponseEntity<SignatureApprovalResponse> declineDocument(
            @PathVariable UUID approvalId,
            @RequestParam String reason) {
        return ResponseEntity.ok(eSignatureService.declineDocument(approvalId, reason));
    }

    @RequiresPermission(DOCUMENT_APPROVE)
    @GetMapping("/requests/{requestId}/approvals")
    public ResponseEntity<List<SignatureApprovalResponse>> getApprovalsByRequest(
            @PathVariable UUID requestId) {
        return ResponseEntity.ok(eSignatureService.getApprovalsByRequest(requestId));
    }

    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    @GetMapping("/approvals/signer/{signerId}/pending")
    public ResponseEntity<List<SignatureApprovalResponse>> getPendingApprovalsBySigner(
            @PathVariable UUID signerId) {
        return ResponseEntity.ok(eSignatureService.getPendingApprovalsBySigner(signerId));
    }

    @RequiresPermission(DOCUMENT_UPLOAD)
    @DeleteMapping("/approvals/{approvalId}")
    public ResponseEntity<Void> removeSigner(@PathVariable UUID approvalId) {
        eSignatureService.removeSigner(approvalId);
        return ResponseEntity.noContent().build();
    }
}
