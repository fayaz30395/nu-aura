package com.hrms.application.mobile.service;

import com.hrms.api.mobile.dto.MobileApprovalDto;
import com.hrms.application.workflow.service.ApprovalService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MobileApprovalService {

    private final ApprovalService approvalService;

    /**
     * Get pending approvals with count breakdown
     */
    @Transactional(readOnly = true)
    public MobileApprovalDto.PendingApprovalsResponse getPendingApprovals() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        // Fetch pending approvals from ApprovalService
        // This is a placeholder - integrate with actual approval service
        List<MobileApprovalDto.ApprovalItem> approvals = new ArrayList<>();

        MobileApprovalDto.PendingApprovalsResponse.ApprovalCounts counts =
                MobileApprovalDto.PendingApprovalsResponse.ApprovalCounts.builder()
                        .leaveRequestsCount(0)
                        .expenseClaimsCount(0)
                        .employmentChangesCount(0)
                        .overtimeRequestsCount(0)
                        .assetRequestsCount(0)
                        .build();

        return MobileApprovalDto.PendingApprovalsResponse.builder()
                .totalPendingCount(approvals.size())
                .counts(counts)
                .approvals(approvals)
                .build();
    }

    /**
     * Action on a single approval (approve or reject)
     */
    @Transactional
    public MobileApprovalDto.ApprovalActionResponse actionApproval(
            MobileApprovalDto.ApprovalActionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        // Process approval action through ApprovalService
        // This is a placeholder - integrate with actual approval service
        String status = "APPROVED".equalsIgnoreCase(request.getAction()) ? "APPROVED" : "REJECTED";

        return MobileApprovalDto.ApprovalActionResponse.builder()
                .approvalId(request.getApprovalId())
                .status(status)
                .actionedAt(LocalDateTime.now())
                .message(status + " successfully")
                .build();
    }

    /**
     * Bulk action on multiple approvals
     */
    @Transactional
    public MobileApprovalDto.ApprovalActionResponse bulkActionApprovals(
            MobileApprovalDto.BulkApprovalRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        // Process bulk approval actions
        // This is a placeholder - integrate with actual approval service
        String status = "APPROVED".equalsIgnoreCase(request.getAction()) ? "APPROVED" : "REJECTED";

        return MobileApprovalDto.ApprovalActionResponse.builder()
                .status(status)
                .actionedAt(LocalDateTime.now())
                .message("Processed " + request.getApprovalIds().size() + " approvals")
                .build();
    }
}
