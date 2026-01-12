package com.hrms.api.selfservice.controller;

import com.hrms.api.selfservice.dto.*;
import com.hrms.application.selfservice.service.SelfServiceService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.selfservice.DocumentRequest.DocumentType;
import com.hrms.domain.selfservice.ProfileUpdateRequest.UpdateCategory;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/self-service")
@RequiredArgsConstructor
@Slf4j
public class SelfServiceController {

    private final SelfServiceService selfServiceService;

    // ==================== Profile Update Request Endpoints ====================

    @PostMapping("/profile-updates")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<ProfileUpdateResponse> createProfileUpdateRequest(
            @RequestParam UUID employeeId,
            @Valid @RequestBody ProfileUpdateRequestDto request) {
        log.info("Creating profile update request for employee: {}", employeeId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(selfServiceService.createProfileUpdateRequest(employeeId, request));
    }

    @GetMapping("/profile-updates/{requestId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<ProfileUpdateResponse> getProfileUpdateRequest(@PathVariable UUID requestId) {
        return ResponseEntity.ok(selfServiceService.getProfileUpdateRequestById(requestId));
    }

    @GetMapping("/profile-updates/my-requests")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<ProfileUpdateResponse>> getMyProfileUpdateRequests(
            @RequestParam UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(selfServiceService.getMyProfileUpdateRequests(employeeId, pageable));
    }

    @GetMapping("/profile-updates/pending")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<Page<ProfileUpdateResponse>> getPendingProfileUpdateRequests(Pageable pageable) {
        return ResponseEntity.ok(selfServiceService.getPendingProfileUpdateRequests(pageable));
    }

    @GetMapping("/profile-updates")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_ALL)
    public ResponseEntity<Page<ProfileUpdateResponse>> getAllProfileUpdateRequests(Pageable pageable) {
        return ResponseEntity.ok(selfServiceService.getAllProfileUpdateRequests(pageable));
    }

    @PostMapping("/profile-updates/{requestId}/approve")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<ProfileUpdateResponse> approveProfileUpdateRequest(
            @PathVariable UUID requestId,
            @RequestParam UUID reviewerId,
            @RequestParam(required = false) String comments) {
        log.info("Approving profile update request: {}", requestId);
        return ResponseEntity.ok(selfServiceService.approveProfileUpdateRequest(requestId, reviewerId, comments));
    }

    @PostMapping("/profile-updates/{requestId}/reject")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<ProfileUpdateResponse> rejectProfileUpdateRequest(
            @PathVariable UUID requestId,
            @RequestParam UUID reviewerId,
            @RequestParam String reason) {
        log.info("Rejecting profile update request: {}", requestId);
        return ResponseEntity.ok(selfServiceService.rejectProfileUpdateRequest(requestId, reviewerId, reason));
    }

    @PostMapping("/profile-updates/{requestId}/cancel")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> cancelProfileUpdateRequest(
            @PathVariable UUID requestId,
            @RequestParam UUID employeeId) {
        log.info("Cancelling profile update request: {}", requestId);
        selfServiceService.cancelProfileUpdateRequest(requestId, employeeId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Document Request Endpoints ====================

    @PostMapping("/document-requests")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<DocumentRequestResponse> createDocumentRequest(
            @RequestParam UUID employeeId,
            @Valid @RequestBody DocumentRequestDto request) {
        log.info("Creating document request for employee: {}", employeeId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(selfServiceService.createDocumentRequest(employeeId, request));
    }

    @GetMapping("/document-requests/{requestId}")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<DocumentRequestResponse> getDocumentRequest(@PathVariable UUID requestId) {
        return ResponseEntity.ok(selfServiceService.getDocumentRequestById(requestId));
    }

    @GetMapping("/document-requests/my-requests")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Page<DocumentRequestResponse>> getMyDocumentRequests(
            @RequestParam UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(selfServiceService.getMyDocumentRequests(employeeId, pageable));
    }

    @GetMapping("/document-requests/pending")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<Page<DocumentRequestResponse>> getPendingDocumentRequests(Pageable pageable) {
        return ResponseEntity.ok(selfServiceService.getPendingDocumentRequests(pageable));
    }

    @GetMapping("/document-requests/urgent")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<List<DocumentRequestResponse>> getUrgentDocumentRequests() {
        return ResponseEntity.ok(selfServiceService.getUrgentDocumentRequests());
    }

    @PostMapping("/document-requests/{requestId}/start-processing")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<DocumentRequestResponse> startProcessingDocument(
            @PathVariable UUID requestId,
            @RequestParam UUID processedById) {
        log.info("Starting document processing: {}", requestId);
        return ResponseEntity.ok(selfServiceService.startProcessingDocument(requestId, processedById));
    }

    @PostMapping("/document-requests/{requestId}/complete")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<DocumentRequestResponse> completeDocumentRequest(
            @PathVariable UUID requestId,
            @RequestParam String documentUrl) {
        log.info("Completing document request: {}", requestId);
        return ResponseEntity.ok(selfServiceService.completeDocumentRequest(requestId, documentUrl));
    }

    @PostMapping("/document-requests/{requestId}/deliver")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<DocumentRequestResponse> markDocumentDelivered(@PathVariable UUID requestId) {
        log.info("Marking document as delivered: {}", requestId);
        return ResponseEntity.ok(selfServiceService.markDocumentDelivered(requestId));
    }

    @PostMapping("/document-requests/{requestId}/reject")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<DocumentRequestResponse> rejectDocumentRequest(
            @PathVariable UUID requestId,
            @RequestParam UUID rejectedBy,
            @RequestParam String reason) {
        log.info("Rejecting document request: {}", requestId);
        return ResponseEntity.ok(selfServiceService.rejectDocumentRequest(requestId, rejectedBy, reason));
    }

    // ==================== Dashboard Endpoints ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<SelfServiceDashboardResponse> getDashboard(@RequestParam UUID employeeId) {
        return ResponseEntity.ok(selfServiceService.getDashboard(employeeId));
    }

    // ==================== Reference Data Endpoints ====================

    @GetMapping("/update-categories")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<UpdateCategory[]> getUpdateCategories() {
        return ResponseEntity.ok(UpdateCategory.values());
    }

    @GetMapping("/document-types")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<DocumentType[]> getDocumentTypes() {
        return ResponseEntity.ok(DocumentType.values());
    }
}
