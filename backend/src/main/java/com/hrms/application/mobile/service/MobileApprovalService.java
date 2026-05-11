package com.hrms.application.mobile.service;

import com.hrms.api.mobile.dto.MobileApprovalDto;
import com.hrms.application.workflow.service.ApprovalService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Mobile-facing approvals facade.
 *
 * <p><strong>STUB-GATED (QA sweep S2-C K-1):</strong> The pending-approvals listing,
 * single action, and bulk action endpoints are <em>not</em> wired through to the real
 * approval workflow yet. The injected {@link ApprovalService} exposes only
 * {@code getPendingApprovalsCount(userId)} — it does not return the per-item titles,
 * requestor names, or per-step metadata that {@link MobileApprovalDto.ApprovalItem}
 * requires, and it has no action / bulk-action methods. Wiring this surface
 * end-to-end requires touching {@code WorkflowService} which is out of scope here.</p>
 *
 * <p>To avoid silently returning empty arrays / fake success responses (which let users
 * believe their approvals went through), every method now throws
 * {@link UnsupportedOperationException} unless {@code app.features.mobile-approvals=true}
 * is explicitly set. Until that flag flips, callers receive a 501-style failure
 * surfaced by the global exception handler.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class MobileApprovalService {

    @SuppressWarnings("unused") // Retained for the wire-up that follows the feature flag flip
    private final ApprovalService approvalService;

    @Value("${app.features.mobile-approvals:false}")
    private boolean enabled;

    /**
     * Get pending approvals with count breakdown.
     *
     * @throws UnsupportedOperationException when {@code app.features.mobile-approvals} is false
     */
    @Transactional(readOnly = true)
    public MobileApprovalDto.PendingApprovalsResponse getPendingApprovals() {
        requireEnabled();
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        log.warn("MobileApprovalService.getPendingApprovals invoked with feature flag on but no implementation wired — tenant={}, user={}",
                tenantId, userId);
        throw new UnsupportedOperationException("Mobile approvals listing not yet implemented");
    }

    /**
     * Action on a single approval (approve or reject).
     *
     * @throws UnsupportedOperationException when {@code app.features.mobile-approvals} is false
     */
    @Transactional
    public MobileApprovalDto.ApprovalActionResponse actionApproval(
            MobileApprovalDto.ApprovalActionRequest request) {
        requireEnabled();
        throw new UnsupportedOperationException("Mobile approval action not yet implemented");
    }

    /**
     * Bulk action on multiple approvals.
     *
     * @throws UnsupportedOperationException when {@code app.features.mobile-approvals} is false
     */
    @Transactional
    public MobileApprovalDto.ApprovalActionResponse bulkActionApprovals(
            MobileApprovalDto.BulkApprovalRequest request) {
        requireEnabled();
        throw new UnsupportedOperationException("Mobile bulk approval action not yet implemented");
    }

    private void requireEnabled() {
        if (!enabled) {
            throw new UnsupportedOperationException(
                    "Mobile approvals are not implemented. Set app.features.mobile-approvals=true once the workflow integration ships.");
        }
    }
}
