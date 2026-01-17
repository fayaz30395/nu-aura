package com.hrms.api.esignature.controller;

import com.hrms.api.esignature.dto.*;
import com.hrms.application.esignature.service.ESignatureService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
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

    @RequiresPermission(ESIGNATURE_REQUEST)
    @PostMapping("/requests")
    public ResponseEntity<SignatureRequestResponse> createSignatureRequest(
            @RequestBody SignatureRequestRequest request) {
        UUID createdBy = SecurityContext.getCurrentEmployeeId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eSignatureService.createSignatureRequest(request, createdBy));
    }

    @RequiresPermission(ESIGNATURE_MANAGE)
    @PutMapping("/requests/{id}")
    public ResponseEntity<SignatureRequestResponse> updateSignatureRequest(
            @PathVariable UUID id,
            @RequestBody SignatureRequestRequest request) {
        return ResponseEntity.ok(eSignatureService.updateSignatureRequest(id, request));
    }

    @RequiresPermission(ESIGNATURE_REQUEST)
    @PatchMapping("/requests/{id}/send")
    public ResponseEntity<SignatureRequestResponse> sendForSignature(@PathVariable UUID id) {
        return ResponseEntity.ok(eSignatureService.sendForSignature(id));
    }

    @RequiresPermission(ESIGNATURE_MANAGE)
    @PatchMapping("/requests/{id}/cancel")
    public ResponseEntity<SignatureRequestResponse> cancelSignatureRequest(
            @PathVariable UUID id,
            @RequestParam String reason) {
        UUID cancelledBy = SecurityContext.getCurrentEmployeeId();
        return ResponseEntity.ok(eSignatureService.cancelSignatureRequest(id, cancelledBy, reason));
    }

    @RequiresPermission({ESIGNATURE_VIEW, ESIGNATURE_SIGN})
    @GetMapping("/requests/{id}")
    public ResponseEntity<SignatureRequestResponse> getSignatureRequestById(@PathVariable UUID id) {
        return ResponseEntity.ok(eSignatureService.getSignatureRequestById(id));
    }

    @RequiresPermission(ESIGNATURE_VIEW)
    @GetMapping("/requests")
    public ResponseEntity<Page<SignatureRequestResponse>> getAllSignatureRequests(Pageable pageable) {
        return ResponseEntity.ok(eSignatureService.getAllSignatureRequests(pageable));
    }

    @RequiresPermission({ESIGNATURE_VIEW, ESIGNATURE_REQUEST})
    @GetMapping("/requests/creator/{creatorId}")
    public ResponseEntity<List<SignatureRequestResponse>> getSignatureRequestsByCreator(
            @PathVariable UUID creatorId) {
        return ResponseEntity.ok(eSignatureService.getSignatureRequestsByCreator(creatorId));
    }

    @RequiresPermission(ESIGNATURE_VIEW)
    @GetMapping("/requests/status/{status}")
    public ResponseEntity<List<SignatureRequestResponse>> getSignatureRequestsByStatus(
            @PathVariable SignatureRequest.SignatureStatus status) {
        return ResponseEntity.ok(eSignatureService.getSignatureRequestsByStatus(status));
    }

    @RequiresPermission(ESIGNATURE_VIEW)
    @GetMapping("/requests/templates")
    public ResponseEntity<List<SignatureRequestResponse>> getTemplates() {
        return ResponseEntity.ok(eSignatureService.getTemplates());
    }

    @RequiresPermission(ESIGNATURE_MANAGE)
    @DeleteMapping("/requests/{id}")
    public ResponseEntity<Void> deleteSignatureRequest(@PathVariable UUID id) {
        eSignatureService.deleteSignatureRequest(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Signature Approval Endpoints ====================

    @RequiresPermission(ESIGNATURE_REQUEST)
    @PostMapping("/requests/{requestId}/signers")
    public ResponseEntity<SignatureApprovalResponse> addSigner(
            @PathVariable UUID requestId,
            @RequestBody SignatureApprovalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eSignatureService.addSigner(requestId, request));
    }

    @RequiresPermission(ESIGNATURE_SIGN)
    @PostMapping("/approvals/{approvalId}/sign")
    public ResponseEntity<SignatureApprovalResponse> signDocument(
            @PathVariable UUID approvalId,
            @RequestBody SignDocumentRequest request) {
        return ResponseEntity.ok(eSignatureService.signDocument(approvalId, request));
    }

    @RequiresPermission(ESIGNATURE_SIGN)
    @PostMapping("/approvals/{approvalId}/decline")
    public ResponseEntity<SignatureApprovalResponse> declineDocument(
            @PathVariable UUID approvalId,
            @RequestParam String reason) {
        return ResponseEntity.ok(eSignatureService.declineDocument(approvalId, reason));
    }

    @RequiresPermission(ESIGNATURE_VIEW)
    @GetMapping("/requests/{requestId}/approvals")
    public ResponseEntity<List<SignatureApprovalResponse>> getApprovalsByRequest(
            @PathVariable UUID requestId) {
        return ResponseEntity.ok(eSignatureService.getApprovalsByRequest(requestId));
    }

    @RequiresPermission(ESIGNATURE_SIGN)
    @GetMapping("/approvals/signer/{signerId}/pending")
    public ResponseEntity<List<SignatureApprovalResponse>> getPendingApprovalsBySigner(
            @PathVariable UUID signerId) {
        return ResponseEntity.ok(eSignatureService.getPendingApprovalsBySigner(signerId));
    }

    @RequiresPermission(ESIGNATURE_MANAGE)
    @DeleteMapping("/approvals/{approvalId}")
    public ResponseEntity<Void> removeSigner(@PathVariable UUID approvalId) {
        eSignatureService.removeSigner(approvalId);
        return ResponseEntity.noContent().build();
    }

    // ==================== External (Token-Based) Signing Endpoints ====================
    // These endpoints are PUBLIC and do not require authentication

    /**
     * Get document information for external signer using token from email link.
     * Public endpoint - no authentication required.
     */
    @GetMapping("/external/{token}")
    public ResponseEntity<ExternalSignatureInfoResponse> getExternalSignatureInfo(
            @PathVariable String token) {
        return ResponseEntity.ok(eSignatureService.getExternalSignatureInfo(token));
    }

    /**
     * Sign document as external signer (candidate/external party).
     * Validates token and email before signing.
     * Public endpoint - no authentication required.
     */
    @PostMapping("/external/{token}/sign")
    public ResponseEntity<SignatureApprovalResponse> signDocumentExternal(
            @PathVariable String token,
            @RequestBody ExternalSignRequest request) {
        return ResponseEntity.ok(eSignatureService.signDocumentExternal(token, request));
    }

    /**
     * Decline document as external signer.
     * Public endpoint - no authentication required.
     */
    @PostMapping("/external/{token}/decline")
    public ResponseEntity<SignatureApprovalResponse> declineDocumentExternal(
            @PathVariable String token,
            @RequestParam String signerEmail,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(eSignatureService.declineDocumentExternal(token, signerEmail, reason));
    }
}
