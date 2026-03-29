package com.hrms.application.workflow.scheduler;

import com.hrms.common.config.WorkflowEscalationConfig;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.notification.Notification;
import com.hrms.domain.workflow.ApprovalStep;
import com.hrms.domain.workflow.StepExecution;
import com.hrms.domain.workflow.WorkflowExecution;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.infrastructure.workflow.repository.StepExecutionRepository;
import com.hrms.infrastructure.workflow.repository.ApprovalStepRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Scheduled job for workflow escalation and SLA management.
 *
 * <p>Responsibilities:</p>
 * <ol>
 *   <li><b>Escalation:</b> Automatically escalates overdue approval steps to configured escalation targets</li>
 *   <li><b>Auto-actions:</b> Auto-approves or auto-rejects steps configured for timeout actions</li>
 *   <li><b>Reminders:</b> Sends reminder notifications for pending approvals nearing deadline</li>
 * </ol>
 *
 * <p>Runs every hour to check for overdue approvals across all tenants.</p>
 *
 * <p><strong>P0 Stabilization:</strong> This scheduler ensures approval workflows don't get stuck
 * indefinitely, which is critical for business processes like leave approvals and expense claims.</p>
 */
@Component
@ConditionalOnProperty(name = "app.workflow.escalation.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class WorkflowEscalationScheduler {

    private final WorkflowEscalationConfig config;

    private final StepExecutionRepository stepExecutionRepository;
    private final ApprovalStepRepository approvalStepRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Main escalation job - runs hourly.
     * Cron: Every hour at minute 15 (e.g., 00:15, 01:15, ...)
     */
    @Scheduled(cron = "0 15 * * * *")
    @SchedulerLock(name = "workflowProcessEscalations", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void processEscalations() {
        log.info("WorkflowEscalationScheduler: starting escalation run");

        List<UUID> tenants = fetchActiveTenants();
        int totalEscalated = 0;
        int totalAutoActioned = 0;
        int totalReminders = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);

                int escalated = processOverdueEscalations(tenantId);
                int autoActioned = processAutoTimeoutActions(tenantId);
                int reminders = sendDeadlineReminders(tenantId);

                totalEscalated += escalated;
                totalAutoActioned += autoActioned;
                totalReminders += reminders;

            } catch (Exception e) {
                log.error("Failed to process escalations for tenant {}: {}", tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("WorkflowEscalationScheduler: completed. Escalated: {}, Auto-actioned: {}, Reminders: {}",
                totalEscalated, totalAutoActioned, totalReminders);
    }

    /**
     * Process overdue steps that need escalation.
     */
    @Transactional
    public int processOverdueEscalations(UUID tenantId) {
        LocalDateTime now = LocalDateTime.now();
        List<StepExecution> overdueSteps = stepExecutionRepository.findOverdueStepsWithExecution(tenantId, now);

        int escalatedCount = 0;

        for (StepExecution step : overdueSteps) {
            // Skip if already escalated
            if (step.isEscalated()) {
                continue;
            }

            // Load the approval step definition to check escalation settings
            ApprovalStep approvalStepDef = step.getApprovalStep();
            if (approvalStepDef == null) {
                approvalStepDef = approvalStepRepository.findById(step.getApprovalStep().getId())
                        .orElse(null);
            }

            if (approvalStepDef == null || !approvalStepDef.isEscalationEnabled()) {
                continue;
            }

            // Check if enough time has passed for escalation
            if (step.getDeadline() != null && step.getAssignedAt() != null) {
                long hoursOverdue = Duration.between(step.getDeadline(), now).toHours();

                // Only escalate if overdue by at least the configured hours
                if (hoursOverdue < 0) {
                    continue; // Not actually overdue yet based on deadline
                }
            }

            // Determine escalation target
            UUID escalateToUserId = determineEscalationTarget(approvalStepDef, step, tenantId);
            if (escalateToUserId == null) {
                log.warn("No escalation target found for step {} in workflow {}",
                        step.getId(), step.getWorkflowExecution().getId());
                continue;
            }

            // Perform escalation
            step.escalate(escalateToUserId);
            step.setAssignedToUserId(escalateToUserId);
            stepExecutionRepository.save(step);

            // Send notification to escalation target
            sendEscalationNotification(step, escalateToUserId);

            // Send notification to original assignee
            if (step.getAssignedToUserId() != null && !step.getAssignedToUserId().equals(escalateToUserId)) {
                sendEscalationOriginatorNotification(step);
            }

            escalatedCount++;
            log.info("Escalated step {} to user {} for workflow {}",
                    step.getId(), escalateToUserId, step.getWorkflowExecution().getId());
        }

        return escalatedCount;
    }

    /**
     * Process steps configured for auto-approve or auto-reject on timeout.
     */
    @Transactional
    public int processAutoTimeoutActions(UUID tenantId) {
        LocalDateTime now = LocalDateTime.now();
        List<StepExecution> overdueSteps = stepExecutionRepository.findOverdueStepsWithExecution(tenantId, now);

        int autoActionedCount = 0;

        for (StepExecution step : overdueSteps) {
            ApprovalStep approvalStepDef = step.getApprovalStep();
            if (approvalStepDef == null) {
                continue;
            }

            if (approvalStepDef.isAutoApproveOnTimeout()) {
                // Auto-approve
                step.setStatus(StepExecution.StepStatus.APPROVED);
                step.setAction(StepExecution.ApprovalAction.APPROVE);
                step.setComments("Auto-approved due to SLA timeout");
                step.setExecutedAt(LocalDateTime.now());
                stepExecutionRepository.save(step);

                sendAutoActionNotification(step, "approved");
                autoActionedCount++;

                log.info("Auto-approved step {} due to SLA timeout", step.getId());

            } else if (approvalStepDef.isAutoRejectOnTimeout()) {
                // Auto-reject
                step.setStatus(StepExecution.StepStatus.REJECTED);
                step.setAction(StepExecution.ApprovalAction.REJECT);
                step.setComments("Auto-rejected due to SLA timeout - no action taken within deadline");
                step.setExecutedAt(LocalDateTime.now());
                stepExecutionRepository.save(step);

                sendAutoActionNotification(step, "rejected");
                autoActionedCount++;

                log.info("Auto-rejected step {} due to SLA timeout", step.getId());
            }
        }

        return autoActionedCount;
    }

    /**
     * Send reminder notifications for pending approvals nearing deadline.
     */
    @Transactional
    public int sendDeadlineReminders(UUID tenantId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reminderThreshold = now.plusHours(config.getReminderHoursBeforeDeadline());

        // Find pending steps with deadline approaching
        List<StepExecution> pendingSteps = stepExecutionRepository.findPendingForUserWithExecution(tenantId, null);

        int remindersSent = 0;

        for (StepExecution step : pendingSteps) {
            // Check if deadline is within reminder threshold
            if (step.getDeadline() == null || step.getDeadline().isAfter(reminderThreshold)) {
                continue;
            }

            // Check if already overdue (handled by escalation)
            if (step.getDeadline().isBefore(now)) {
                continue;
            }

            // Check reminder limits
            if (step.getReminderCount() >= config.getMaxReminders()) {
                continue;
            }

            // Check time since last reminder
            if (step.getLastReminderSentAt() != null) {
                long hoursSinceLastReminder = Duration.between(step.getLastReminderSentAt(), now).toHours();
                if (hoursSinceLastReminder < config.getMinHoursBetweenReminders()) {
                    continue;
                }
            }

            // Send reminder
            sendReminderNotification(step);

            // Update reminder tracking
            step.setReminderCount(step.getReminderCount() + 1);
            step.setLastReminderSentAt(now);
            stepExecutionRepository.save(step);

            remindersSent++;
        }

        return remindersSent;
    }

    // ========== Helper Methods ==========

    private UUID determineEscalationTarget(ApprovalStep approvalStepDef, StepExecution step, UUID tenantId) {
        // First check for specific escalation user
        if (approvalStepDef.getEscalateToUserId() != null) {
            return approvalStepDef.getEscalateToUserId();
        }

        // Check for escalation role - get first user with that role
        if (approvalStepDef.getEscalateToRoleId() != null) {
            try {
                UUID userId = jdbcTemplate.queryForObject(
                        "SELECT ur.user_id FROM user_roles ur " +
                        "JOIN users u ON ur.user_id = u.id " +
                        "WHERE ur.role_id = ? AND u.tenant_id = ? AND u.is_active = true " +
                        "LIMIT 1",
                        UUID.class,
                        approvalStepDef.getEscalateToRoleId(),
                        tenantId);
                return userId;
            } catch (Exception e) {
                log.warn("Could not find user with escalation role {}: {}",
                        approvalStepDef.getEscalateToRoleId(), e.getMessage());
            }
        }

        // Fallback: escalate to skip-level manager of the original approver
        if (step.getAssignedToUserId() != null) {
            try {
                // Get the approver's manager's manager
                UUID skipLevelManager = jdbcTemplate.queryForObject(
                        "SELECT m2.user_id FROM employees e " +
                        "JOIN employees m1 ON e.reporting_manager_id = m1.id " +
                        "JOIN employees m2 ON m1.reporting_manager_id = m2.id " +
                        "WHERE e.user_id = ? AND e.tenant_id = ?",
                        UUID.class,
                        step.getAssignedToUserId(),
                        tenantId);
                return skipLevelManager;
            } catch (Exception e) {
                // Try just the direct manager
                try {
                    UUID directManager = jdbcTemplate.queryForObject(
                            "SELECT m.user_id FROM employees e " +
                            "JOIN employees m ON e.reporting_manager_id = m.id " +
                            "WHERE e.user_id = ? AND e.tenant_id = ?",
                            UUID.class,
                            step.getAssignedToUserId(),
                            tenantId);
                    return directManager;
                } catch (Exception e2) {
                    log.warn("Could not find manager for escalation: {}", e2.getMessage());
                }
            }
        }

        return null;
    }

    private void sendEscalationNotification(StepExecution step, UUID escalateToUserId) {
        try {
            WorkflowExecution execution = step.getWorkflowExecution();
            String title = "Escalated Approval: " + execution.getTitle();
            String message = String.format(
                    "An approval request '%s' has been escalated to you because it was not actioned within the deadline. " +
                    "Reference: %s. Please review and take action.",
                    execution.getTitle(),
                    execution.getReferenceNumber() != null ? execution.getReferenceNumber() : execution.getId().toString()
            );

            notificationService.createNotification(
                    escalateToUserId,
                    Notification.NotificationType.APPROVAL_REQUIRED,
                    title,
                    message,
                    step.getId(),
                    "StepExecution",
                    "/approvals/inbox",
                    Notification.Priority.HIGH
            );
        } catch (Exception e) {
            log.error("Failed to send escalation notification: {}", e.getMessage());
        }
    }

    private void sendEscalationOriginatorNotification(StepExecution step) {
        try {
            WorkflowExecution execution = step.getWorkflowExecution();
            String title = "Approval Escalated";
            String message = String.format(
                    "The approval request '%s' has been escalated due to missed deadline. " +
                    "Reference: %s.",
                    execution.getTitle(),
                    execution.getReferenceNumber() != null ? execution.getReferenceNumber() : execution.getId().toString()
            );

            // Notify original assignee if different from escalation target
            UUID originalAssignee = step.getDelegatedFromUserId() != null ?
                    step.getDelegatedFromUserId() : step.getAssignedToUserId();

            if (originalAssignee != null && !originalAssignee.equals(step.getEscalatedToUserId())) {
                notificationService.createNotification(
                        originalAssignee,
                        Notification.NotificationType.SYSTEM,
                        title,
                        message,
                        step.getId(),
                        "StepExecution",
                        null,
                        Notification.Priority.NORMAL
                );
            }
        } catch (Exception e) {
            log.error("Failed to send escalation originator notification: {}", e.getMessage());
        }
    }

    private void sendAutoActionNotification(StepExecution step, String action) {
        try {
            WorkflowExecution execution = step.getWorkflowExecution();
            String title = String.format("Request Auto-%s", action.substring(0, 1).toUpperCase() + action.substring(1));
            String message = String.format(
                    "Your request '%s' has been auto-%s due to SLA timeout. " +
                    "Reference: %s.",
                    execution.getTitle(),
                    action,
                    execution.getReferenceNumber() != null ? execution.getReferenceNumber() : execution.getId().toString()
            );

            // Notify the requester
            notificationService.createNotification(
                    execution.getRequesterId(),
                    Notification.NotificationType.APPROVAL_UPDATE,
                    title,
                    message,
                    execution.getId(),
                    "WorkflowExecution",
                    "/approvals/my-requests",
                    "rejected".equals(action) ? Notification.Priority.HIGH : Notification.Priority.NORMAL
            );
        } catch (Exception e) {
            log.error("Failed to send auto-action notification: {}", e.getMessage());
        }
    }

    private void sendReminderNotification(StepExecution step) {
        try {
            if (step.getAssignedToUserId() == null) {
                return;
            }

            WorkflowExecution execution = step.getWorkflowExecution();
            long hoursRemaining = Duration.between(LocalDateTime.now(), step.getDeadline()).toHours();

            String title = "Reminder: Pending Approval";
            String message = String.format(
                    "You have a pending approval for '%s' that requires your attention. " +
                    "Deadline: %d hours remaining. Reference: %s.",
                    execution.getTitle(),
                    Math.max(hoursRemaining, 1),
                    execution.getReferenceNumber() != null ? execution.getReferenceNumber() : execution.getId().toString()
            );

            notificationService.createNotification(
                    step.getAssignedToUserId(),
                    Notification.NotificationType.REMINDER,
                    title,
                    message,
                    step.getId(),
                    "StepExecution",
                    "/approvals/inbox",
                    Notification.Priority.NORMAL
            );
        } catch (Exception e) {
            log.error("Failed to send reminder notification: {}", e.getMessage());
        }
    }

    private List<UUID> fetchActiveTenants() {
        try {
            return jdbcTemplate.queryForList(
                    "SELECT id FROM tenants WHERE is_active = true", UUID.class);
        } catch (Exception e) {
            log.warn("Could not fetch active tenants: {}", e.getMessage());
            return List.of();
        }
    }
}
