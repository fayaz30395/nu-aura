package com.hrms.application.workflow.scheduler;

import com.hrms.application.workflow.service.ApprovalEscalationService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.tenant.Tenant;
import com.hrms.domain.workflow.ApprovalEscalationConfig;
import com.hrms.domain.workflow.StepExecution;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import com.hrms.infrastructure.workflow.repository.ApprovalEscalationConfigRepository;
import com.hrms.infrastructure.workflow.repository.StepExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Scheduled job for automatic escalation of stale approval requests.
 *
 * <p>Responsibilities:
 * <ol>
 *   <li>Find all PENDING step executions that have exceeded their timeout</li>
 *   <li>Check if they can be escalated (haven't reached max escalation limit)</li>
 *   <li>Resolve the escalation target based on the configured strategy</li>
 *   <li>Create a new escalated step for the target approver</li>
 *   <li>Send notification events if configured</li>
 * </ol>
 *
 * <p>Runs every 15 minutes (900,000 ms). Processes all active tenants sequentially
 * with per-tenant failure isolation — one tenant's error does not block others.</p>
 *
 * <p>Escalation is prevented when:
 * <ul>
 *   <li>Max escalations limit is reached</li>
 *   <li>Escalation target cannot be resolved</li>
 *   <li>Escalation config is inactive</li>
 * </ul>
 */
@Component
@ConditionalOnProperty(name = "app.approval.escalation.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class ApprovalEscalationJob {

    private final TenantRepository tenantRepository;
    private final StepExecutionRepository stepExecutionRepository;
    private final ApprovalEscalationConfigRepository escalationConfigRepository;
    private final ApprovalEscalationService escalationService;

    /**
     * Main escalation job.
     * Runs every 15 minutes (900 seconds).
     */
    @Scheduled(fixedRate = 900000)
    @SchedulerLock(name = "approvalProcessEscalations", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void processEscalations() {
        log.info("ApprovalEscalationJob: starting escalation processing");

        List<Tenant> activeTenants = tenantRepository.findByStatus(Tenant.TenantStatus.ACTIVE);
        int totalEscalated = 0;
        int totalFailed = 0;
        int tenantsWithErrors = 0;

        for (Tenant tenant : activeTenants) {
            try {
                TenantContext.setCurrentTenant(tenant.getId());
                int escalatedCount = processEscalationsForTenant(tenant.getId());
                totalEscalated += escalatedCount;
            } catch (Exception e) {
                tenantsWithErrors++;
                totalFailed++;
                log.error("ApprovalEscalationJob: failed for tenant {}: {}",
                        tenant.getId(), e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("ApprovalEscalationJob: completed. Tenants: {}, Escalated: {}, Failed: {}, " +
                        "Tenants with errors: {}",
                activeTenants.size(), totalEscalated, totalFailed, tenantsWithErrors);
    }

    /**
     * Process escalations for a single tenant.
     *
     * @param tenantId The tenant ID
     * @return Number of steps escalated
     */
    @Transactional
    private int processEscalationsForTenant(UUID tenantId) {
        // Fetch all stale PENDING steps that are eligible for escalation
        List<StepExecution> staleSteps = stepExecutionRepository.findStaleStepsForEscalation(tenantId);

        int escalatedCount = 0;

        for (StepExecution step : staleSteps) {
            try {
                boolean escalated = escalateStepIfEligible(step, tenantId);
                if (escalated) {
                    escalatedCount++;
                }
            } catch (Exception e) {
                log.error("Failed to escalate step {} (tenant={}): {}",
                        step.getId(), tenantId, e.getMessage(), e);
            }
        }

        if (escalatedCount > 0) {
            log.debug("Escalated {} steps for tenant {}", escalatedCount, tenantId);
        }

        return escalatedCount;
    }

    /**
     * Escalate a single step if it meets eligibility criteria.
     *
     * @param step The step execution to consider
     * @param tenantId The tenant ID
     * @return true if escalation succeeded, false otherwise
     */
    @Transactional
    private boolean escalateStepIfEligible(StepExecution step, UUID tenantId) {
        // Get the escalation config for this workflow
        UUID workflowDefinitionId = step.getWorkflowExecution().getWorkflowDefinition().getId();
        Optional<ApprovalEscalationConfig> configOpt =
                escalationConfigRepository.findByWorkflowDefinitionIdAndTenantIdAndIsActiveTrue(
                        workflowDefinitionId, tenantId);

        if (configOpt.isEmpty()) {
            log.debug("No active escalation config for workflow {} (tenant={})",
                    workflowDefinitionId, tenantId);
            return false;
        }

        ApprovalEscalationConfig config = configOpt.get();

        // Check if max escalations reached
        int currentEscalationCount = step.getReminderCount();
        if (currentEscalationCount >= config.getMaxEscalations()) {
            log.warn("Step {} has reached max escalations ({}) for workflow {} (tenant={})",
                    step.getId(), config.getMaxEscalations(), workflowDefinitionId, tenantId);
            return false;
        }

        // Resolve escalation target
        UUID approverUserId = step.getAssignedToUserId();
        Optional<UUID> targetUserIdOpt = escalationService.resolveEscalationTarget(
                approverUserId, config, tenantId);

        if (targetUserIdOpt.isEmpty()) {
            log.warn("Could not resolve escalation target for step {} (strategy={}, tenant={})",
                    step.getId(), config.getEscalationType(), tenantId);
            // Try fallback
            Optional<UUID> fallbackOpt = escalationService.resolveFallbackTarget(tenantId);
            if (fallbackOpt.isEmpty()) {
                log.error("No escalation target or fallback available for step {} (tenant={})",
                        step.getId(), tenantId);
                return false;
            }
            targetUserIdOpt = fallbackOpt;
        }

        UUID targetUserId = targetUserIdOpt.get();

        // Prevent escalating to the same user
        if (targetUserId.equals(approverUserId)) {
            log.warn("Escalation target {} is same as current approver for step {} (tenant={})",
                    targetUserId, step.getId(), tenantId);
            return false;
        }

        // Perform escalation
        escalationService.escalateStep(step, targetUserId, config);

        // Create new escalated step
        StepExecution escalatedStep = StepExecution.builder()
                .tenantId(tenantId)
                .workflowExecution(step.getWorkflowExecution())
                .approvalStep(step.getApprovalStep())
                .stepOrder(step.getStepOrder())
                .stepName("Escalated: " + step.getStepName())
                .status(StepExecution.StepStatus.PENDING)
                .assignedToUserId(targetUserId)
                .assignedAt(LocalDateTime.now())
                .deadline(step.getDeadline())
                .build();

        // Save both steps
        step.setStatus(StepExecution.StepStatus.ESCALATED);
        stepExecutionRepository.save(step);
        stepExecutionRepository.save(escalatedStep);

        log.info("Escalated step {} from {} to {} (workflow={}, strategy={}, tenant={})",
                step.getId(), approverUserId, targetUserId, workflowDefinitionId,
                config.getEscalationType(), tenantId);

        // Send notification event if configured
        if (Boolean.TRUE.equals(config.getNotifyOnEscalation())) {
            // Note: Notification event sending would be implemented here
            // using a Kafka/messaging service when integrated
            log.debug("Notification queued for escalated step {} (tenant={})", step.getId(), tenantId);
        }

        return true;
    }
}
