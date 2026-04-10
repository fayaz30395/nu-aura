package com.hrms.api.selfservice.controller;

import com.hrms.api.selfservice.dto.*;
import com.hrms.application.selfservice.service.SelfServiceService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.selfservice.DocumentRequest.DocumentType;
import com.hrms.domain.selfservice.ProfileUpdateRequest.UpdateCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/self-service")
@RequiredArgsConstructor
@Slf4j
@Validated
public class SelfServiceController {

    private final SelfServiceService selfServiceService;

    // ==================== Profile Update Request Endpoints ====================

    @PostMapping("/profile-updates")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<ProfileUpdateResponse> createProfileUpdateRequest(
            @Valid @RequestBody ProfileUpdateRequestDto request) {
        // BUG-QA2-012 FIX: Guard against null employeeId to prevent 500 when the
        // employee record is not yet linked to the authenticated user's JWT context.
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId == null) {
            throw new com.hrms.common.exception.BusinessException(
                    "No employee record is associated with the current user. " +
                            "Contact HR to link your account.");
        }
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
    public ResponseEntity<Page<ProfileUpdateResponse>> getMyProfileUpdateRequests(Pageable pageable) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
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
            @Size(max = 1000) @RequestParam(required = false) String comments) {
        UUID reviewerId = SecurityContext.getCurrentEmployeeId();
        log.info("Approving profile update request: {} by reviewer: {}", requestId, reviewerId);
        return ResponseEntity.ok(selfServiceService.approveProfileUpdateRequest(requestId, reviewerId, comments));
    }

    @PostMapping("/profile-updates/{requestId}/reject")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    public ResponseEntity<ProfileUpdateResponse> rejectProfileUpdateRequest(
            @PathVariable UUID requestId,
            @NotBlank @Size(max = 1000) @RequestParam String reason) {
        UUID reviewerId = SecurityContext.getCurrentEmployeeId();
        log.info("Rejecting profile update request: {} by reviewer: {}", requestId, reviewerId);
        return ResponseEntity.ok(selfServiceService.rejectProfileUpdateRequest(requestId, reviewerId, reason));
    }

    @PostMapping("/profile-updates/{requestId}/cancel")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> cancelProfileUpdateRequest(@PathVariable UUID requestId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        log.info("Cancelling profile update request: {} by employee: {}", requestId, employeeId);
        selfServiceService.cancelProfileUpdateRequest(requestId, employeeId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Document Request Endpoints ====================

    @PostMapping("/document-requests")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<DocumentRequestResponse> createDocumentRequest(
            @Valid @RequestBody DocumentRequestDto request) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
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
    public ResponseEntity<Page<DocumentRequestResponse>> getMyDocumentRequests(Pageable pageable) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
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
    public ResponseEntity<DocumentRequestResponse> startProcessingDocument(@PathVariable UUID requestId) {
        UUID processedById = SecurityContext.getCurrentEmployeeId();
        log.info("Starting document processing: {} by: {}", requestId, processedById);
        return ResponseEntity.ok(selfServiceService.startProcessingDocument(requestId, processedById));
    }

    @PostMapping("/document-requests/{requestId}/complete")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<DocumentRequestResponse> completeDocumentRequest(
            @PathVariable UUID requestId,
            @NotBlank @Size(max = 255) @RequestParam String documentUrl) {
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
            @NotBlank @Size(max = 1000) @RequestParam String reason) {
        UUID rejectedBy = SecurityContext.getCurrentEmployeeId();
        log.info("Rejecting document request: {} by: {}", requestId, rejectedBy);
        return ResponseEntity.ok(selfServiceService.rejectDocumentRequest(requestId, rejectedBy, reason));
    }

    // ==================== Dashboard Endpoints ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<SelfServiceDashboardResponse> getDashboard() {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
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
