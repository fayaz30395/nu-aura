package com.nulogic.application.document.service;

import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.document.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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

    private final DocumentAccessRepository documentAccessRepository;
    private final DocumentExpiryTrackingRepository expiryTrackingRepository;
    private final TenantTimeService tenantTimeService;

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
                .grantedAt(tenantTimeService.now(tenantId))
                .isActive(true)
                .createdBy(grantedBy)
                .build();

        DocumentAccess savedAccess = documentAccessRepository.save(access);
        log.info("Document access granted: document={}, accessLevel={}", documentId, accessLevel);

        return savedAccess;
    }

    /**
     * List document access grants for a document
     */
    @Transactional(readOnly = true)
    public List<DocumentAccess> listAccess(UUID documentId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return documentAccessRepository.findByTenantIdAndDocumentId(tenantId, documentId);
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

        if (expiryDate.isBefore(tenantTimeService.today(tenantId))) {
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
        tracking.setNotifiedAt(tenantTimeService.now(tenantId));
        expiryTrackingRepository.save(tracking);
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
