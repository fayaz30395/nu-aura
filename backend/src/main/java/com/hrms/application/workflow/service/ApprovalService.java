package com.hrms.application.workflow.service;

import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.workflow.repository.StepExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Lightweight approval summary service.
 *
 * <p>Provides cross-module approval counts backed by the generic
 * {@link StepExecution} workflow engine (table: {@code step_execution}).
 * The full approval workflow is implemented in {@link WorkflowService};
 * this service exposes a read-only projection used by the mobile dashboard
 * and notification badges.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalService {

    private final StepExecutionRepository stepExecutionRepository;

    /**
     * Returns the number of workflow step executions currently assigned to
     * {@code userId} in {@code PENDING} status within the caller's tenant.
     *
     * <p>This covers all approval types driven through the generic workflow
     * engine: leave requests, expense claims, onboarding tasks, document
     * approvals, asset requests, etc.
     *
     * @param userId the authenticated user whose pending queue is counted
     * @return number of pending approvals assigned to this user (≥ 0)
     */
    public int getPendingApprovalsCount(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        long count = stepExecutionRepository.countPendingForUser(tenantId, userId);
        log.debug("getPendingApprovalsCount: user={} tenant={} count={}", userId, tenantId, count);
        // Cast is safe — approval queues never reach Integer.MAX_VALUE in practice
        return (int) Math.min(count, Integer.MAX_VALUE);
    }
}
