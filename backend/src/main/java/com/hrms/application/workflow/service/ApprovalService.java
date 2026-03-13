package com.hrms.application.workflow.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stub service for approval workflows.
 *
 * This is a temporary stub implementation to unblock backend startup.
 * TODO: Implement full approval workflow logic with:
 * - Approval task assignment
 * - Approval chain management
 * - Notification integration
 * - Audit trail
 */
@Service
@Slf4j
@Transactional
public class ApprovalService {

    public ApprovalService() {
        log.warn("ApprovalService is using stub implementation - full workflow logic not yet implemented");
    }

    /**
     * Get count of pending approvals for a user (stub).
     * TODO: Implement with actual workflow query once approval engine is complete.
     *
     * @param userId the user to check pending approvals for
     * @return count of pending approvals (currently returns 0)
     */
    public Integer getPendingApprovalsCount(java.util.UUID userId) {
        log.debug("getPendingApprovalsCount called for user {} - returning 0 (stub)", userId);
        return 0;
    }
}
