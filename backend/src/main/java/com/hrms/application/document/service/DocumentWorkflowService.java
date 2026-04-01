package com.hrms.application.document.service;

import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.document.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for document workflow management
 * Handles approvals, versioning, access control, and expiry tracking
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DocumentWorkflowService {

    private final DocumentApprovalWorkflowRepository approvalWorkflowRepository;
    private final DocumentApprovalTaskRepository approvalTaskRepository;
    private final DocumentAccessRepository documentAccessRepository;
    private final DocumentExpiryTrackingRepository expiryTrackingRepository;

    /**
     * Initiate document approval workflow
     */
    public DocumentApprovalWorkflow initiateApprovalWorkflow(UUID documentId, int totalApprovalLevels) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        // Check if workflow already exists for this document
        var existing = approvalWorkflowRepository.findByTenantIdAndDocumentId(tenantId, documentId);
        if (existing.isPresent() && existing.get().getStatus() == DocumentApprovalWorkflow.WorkflowStatus.IN_PROGRESS) {
            throw new BusinessException("An approval workflow is already in progress for this document");
        }

        DocumentApprovalWorkflow workflow = DocumentApprovalWorkflow.builder()
            .tenantId(tenantId)
            .documentId(documentId)
            .status(DocumentApprovalWorkflow.WorkflowStatus.PENDING)
            .requestedBy(userId)
            .approvalLevel(1)
            .totalApprovalLevels(totalApprovalLevels)
            .initiatedAt(LocalDateTime.now())
            .createdBy(userId)
            .build();

        DocumentApprovalWorkflow savedWorkflow = approvalWorkflowRepository.save(workflow);
        log.info("Approval workflow initiated for document: {} with {} approval levels", documentId, totalApprovalLevels);

        return savedWorkflow;
    }

    /**
     * Create approval task for workflow
     */
    @Transactional
    public DocumentApprovalTask createApprovalTask(UUID workflowId, UUID approverId, int approvalLevel) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        DocumentApprovalWorkflow workflow = approvalWorkflowRepository.findById(workflowId)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow not found"));

        if (!workflow.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access to workflow");
        }

        DocumentApprovalTask task = DocumentApprovalTask.builder()
            .tenantId(tenantId)
            .workflowId(workflowId)
            .approverId(approverId)
            .status(DocumentApprovalTask.TaskStatus.PENDING)
            .approvalLevel(approvalLevel)
            .createdBy(userId)
            .build();

        DocumentApprovalTask savedTask = approvalTaskRepository.save(task);
        log.info("Approval task created: {} for approver: {}", savedTask.getId(), approverId);

        return savedTask;
    }

    /**
     * Approve document
     */
    @Transactional
    public DocumentApprovalWorkflow approveDocument(UUID workflowId, String comments) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        DocumentApprovalWorkflow workflow = approvalWorkflowRepository.findById(workflowId)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow not found"));

        if (!workflow.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access to workflow");
        }

        // Find current approval task
        DocumentApprovalTask currentTask = approvalTaskRepository.findByWorkflowIdAndApprovalLevel(
                workflowId, workflow.getApprovalLevel())
            .orElseThrow(() -> new BusinessException("Current approval task not found"));

        // Verify current user is the approver
        if (!currentTask.getApproverId().equals(userId)) {
            throw new BusinessException("You are not authorized to approve this document");
        }

        // Mark task as approved
        currentTask.setStatus(DocumentApprovalTask.TaskStatus.APPROVED);
        currentTask.setComments(comments);
        currentTask.setApprovedAt(LocalDateTime.now());
        approvalTaskRepository.save(currentTask);

        // Check if all approvals are complete
        if (workflow.getApprovalLevel() >= workflow.getTotalApprovalLevels()) {
            workflow.setStatus(DocumentApprovalWorkflow.WorkflowStatus.APPROVED);
            workflow.setCompletedAt(LocalDateTime.now());
            log.info("Document approved: {}", workflow.getDocumentId());
        } else {
            // Move to next approval level
            workflow.setApprovalLevel(workflow.getApprovalLevel() + 1);
            workflow.setStatus(DocumentApprovalWorkflow.WorkflowStatus.IN_PROGRESS);
        }

        return approvalWorkflowRepository.save(workflow);
    }

    /**
     * Reject document
     */
    @Transactional
    public DocumentApprovalWorkflow rejectDocument(UUID workflowId, String rejectionReason) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        DocumentApprovalWorkflow workflow = approvalWorkflowRepository.findById(workflowId)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow not found"));

        if (!workflow.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access to workflow");
        }

        // Find current approval task
        DocumentApprovalTask currentTask = approvalTaskRepository.findByWorkflowIdAndApprovalLevel(
                workflowId, workflow.getApprovalLevel())
            .orElseThrow(() -> new BusinessException("Current approval task not found"));

        // Verify current user is the approver
        if (!currentTask.getApproverId().equals(userId)) {
            throw new BusinessException("You are not authorized to reject this document");
        }

        // Mark task as rejected
        currentTask.setStatus(DocumentApprovalTask.TaskStatus.REJECTED);
        currentTask.setComments(rejectionReason);
        currentTask.setApprovedAt(LocalDateTime.now());
        approvalTaskRepository.save(currentTask);

        // Mark workflow as rejected
        workflow.setStatus(DocumentApprovalWorkflow.WorkflowStatus.REJECTED);
        workflow.setRejectionReason(rejectionReason);
        workflow.setCompletedAt(LocalDateTime.now());

        log.info("Document rejected: {}", workflow.getDocumentId());
        return approvalWorkflowRepository.save(workflow);
    }

    /**
     * Grant document access to user, role, or department
     */
    public DocumentAccess grantAccess(UUID documentId, UUID userId, UUID roleId, UUID departmentId,
                                      DocumentAccess.AccessLevel accessLevel) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID grantedBy = SecurityContext.getCurrentUserId();

        if (userId == null && roleId == null && departmentId == null) {
            throw new BusinessException("At least one of userId, roleId, or departmentId must be provided");
        }

        DocumentAccess access = DocumentAccess.builder()
            .tenantId(tenantId)
            .documentId(documentId)
            .userId(userId)
            .roleId(roleId)
            .departmentId(departmentId)
            .accessLevel(accessLevel)
            .grantedBy(grantedBy)
            .grantedAt(LocalDateTime.now())
            .isActive(true)
            .createdBy(grantedBy)
            .build();

        DocumentAccess savedAccess = documentAccessRepository.save(access);
        log.info("Document access granted: document={}, accessLevel={}", documentId, accessLevel);

        return savedAccess;
    }

    /**
     * Revoke document access
     */
    @Transactional
    public void revokeAccess(UUID accessId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        DocumentAccess access = documentAccessRepository.findById(accessId)
            .orElseThrow(() -> new ResourceNotFoundException("Access record not found"));

        if (!access.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access");
        }

        access.setIsActive(false);
        documentAccessRepository.save(access);
        log.info("Document access revoked: {}", accessId);
    }

    /**
     * Set document expiry date with reminder tracking
     */
    public DocumentExpiryTracking setDocumentExpiry(UUID documentId, LocalDate expiryDate, Integer reminderDaysBefore) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        if (expiryDate.isBefore(LocalDate.now())) {
            throw new BusinessException("Expiry date must be in the future");
        }

        DocumentExpiryTracking tracking = expiryTrackingRepository.findByTenantIdAndDocumentId(tenantId, documentId)
            .orElse(DocumentExpiryTracking.builder()
                .tenantId(tenantId)
                .documentId(documentId)
                .createdBy(userId)
                .build());

        tracking.setExpiryDate(expiryDate);
        tracking.setReminderDaysBefore(reminderDaysBefore != null ? reminderDaysBefore : 30);
        tracking.setLastModifiedBy(userId);

        DocumentExpiryTracking saved = expiryTrackingRepository.save(tracking);
        log.info("Document expiry set: document={}, expiryDate={}", documentId, expiryDate);

        return saved;
    }

    /**
     * Get documents expiring soon
     */
    @Transactional(readOnly = true)
    public List<DocumentExpiryTracking> getExpiringDocuments(UUID tenantId, LocalDate beforeDate) {
        return expiryTrackingRepository.findByTenantIdAndExpiryDateBefore(tenantId, beforeDate);
    }

    /**
     * Get expired documents
     */
    @Transactional(readOnly = true)
    public List<DocumentExpiryTracking> getExpiredDocuments(UUID tenantId) {
        return expiryTrackingRepository.findExpiredDocuments(tenantId);
    }

    /**
     * Mark expiry reminder as sent
     */
    @Transactional
    public void markReminderSent(UUID expiryTrackingId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        DocumentExpiryTracking tracking = expiryTrackingRepository.findById(expiryTrackingId)
            .orElseThrow(() -> new ResourceNotFoundException("Expiry tracking not found"));

        // Tenant isolation check to prevent cross-tenant reminder manipulation
        if (!tracking.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access to expiry tracking");
        }

        tracking.setIsNotified(true);
        tracking.setNotifiedAt(LocalDateTime.now());
        expiryTrackingRepository.save(tracking);
    }

    /**
     * List approval workflows for tenant
     */
    @Transactional(readOnly = true)
    public Page<DocumentApprovalWorkflow> listApprovalWorkflows(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return approvalWorkflowRepository.findByTenantId(tenantId, pageable);
    }

    /**
     * List pending approvals for current user
     */
    @Transactional(readOnly = true)
    public Page<DocumentApprovalWorkflow> listPendingApprovalsForUser(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        return approvalWorkflowRepository.findByTenantIdAndCurrentApproverIdAndStatus(
            tenantId, userId, DocumentApprovalWorkflow.WorkflowStatus.IN_PROGRESS, pageable);
    }

    /**
     * Get document access for user
     */
    @Transactional(readOnly = true)
    public List<DocumentAccess> getDocumentAccessForUser(UUID documentId, UUID userId, List<UUID> roleIds, UUID departmentId) {
        return documentAccessRepository.findAccessibleByUserOrRoleOrDepartment(documentId, userId, roleIds, departmentId);
    }

    /**
     * Check if user has access to document
     */
    public boolean hasAccessToDocument(UUID documentId, UUID userId, DocumentAccess.AccessLevel requiredLevel) {
        List<DocumentAccess> accesses = documentAccessRepository.findByTenantIdAndDocumentId(
            SecurityContext.getCurrentTenantId(), documentId);

        return accesses.stream()
            .filter(access -> userId.equals(access.getUserId()))
            .filter(access -> Boolean.TRUE.equals(access.getIsActive()))
            .filter(access -> !access.isExpired())
            .anyMatch(access -> hasRequiredAccessLevel(access.getAccessLevel(), requiredLevel));
    }

    /**
     * Check if access level is sufficient
     */
    private boolean hasRequiredAccessLevel(DocumentAccess.AccessLevel actual, DocumentAccess.AccessLevel required) {
        // Hierarchical: MANAGE > APPROVE > EDIT > VIEW
        int actualLevel = getAccessLevelValue(actual);
        int requiredLevel = getAccessLevelValue(required);
        return actualLevel >= requiredLevel;
    }

    private int getAccessLevelValue(DocumentAccess.AccessLevel level) {
        return switch (level) {
            case VIEW -> 1;
            case EDIT -> 2;
            case APPROVE -> 3;
            case MANAGE -> 4;
        };
    }
}
