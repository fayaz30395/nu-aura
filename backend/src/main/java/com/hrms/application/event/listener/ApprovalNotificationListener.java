package com.hrms.application.event.listener;

import com.hrms.application.notification.dto.NotificationMessage;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.application.notification.service.SlackNotificationService;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.event.workflow.ApprovalTaskAssignedEvent;
import com.hrms.domain.event.workflow.ApprovalDecisionEvent;
import com.hrms.domain.notification.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event listener that sends real-time notifications when approval tasks are assigned or decisions are made.
 *
 * <p>Consumes approval workflow events and:</p>
 * <ul>
 *   <li>Creates persistent notifications in the database</li>
 *   <li>Pushes real-time WebSocket notifications to connected clients</li>
 * </ul>
 *
 * <p>Uses {@link TransactionalEventListener} to ensure notifications are sent after
 * the approval workflow state is committed, preventing stale notifications.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApprovalNotificationListener {

    private final NotificationService notificationService;
    private final WebSocketNotificationService wsNotificationService;
    private final SlackNotificationService slackNotificationService;

    /**
     * Handles approval task assignment events.
     * <p>
     * When an approval task is assigned to a user:
     * 1. A persistent notification is created and stored in the database
     * 2. A real-time WebSocket notification is pushed to the assigned user
     *
     * @param event the approval task assigned event
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onApprovalTaskAssigned(ApprovalTaskAssignedEvent event) {
        UUID tenantId = event.getTenantId();
        UUID assignedToUserId = event.getAssignedToUserId();
        UUID stepExecutionId = event.getAggregateId();

        try {
            // Set tenant context for notification operations
            TenantContext.setCurrentTenant(tenantId);

            String entityType = event.getEntityType();
            String requesterName = event.getRequesterName();

            // Build notification title and message
            String title = "New Approval Task";
            String message = String.format("%s has submitted a %s request for approval",
                    requesterName, getEntityTypeLabel(entityType));

            String actionUrl = buildActionUrl(entityType);

            // 1. Create persistent notification in database
            Notification persistentNotification = notificationService.createNotification(
                    assignedToUserId,
                    Notification.NotificationType.TASK_ASSIGNED,
                    title,
                    message,
                    stepExecutionId,
                    entityType,
                    actionUrl,
                    Notification.Priority.NORMAL
            );

            log.debug("Persistent notification created for task assignment: {} -> user {}",
                    stepExecutionId, assignedToUserId);

            // 2. Build and send real-time WebSocket notification
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("stepExecutionId", stepExecutionId.toString());
            metadata.put("entityType", entityType);
            metadata.put("requesterName", requesterName);
            if (event.getRequesterId() != null) {
                metadata.put("requesterId", event.getRequesterId().toString());
            }
            metadata.put("assignedAt", LocalDateTime.now().toString());

            NotificationMessage wsNotification = NotificationMessage.builder()
                    .type(NotificationMessage.NotificationType.TASK_ASSIGNED)
                    .title(title)
                    .message(message)
                    .priority(NotificationMessage.Priority.HIGH)
                    .actionUrl(actionUrl)
                    .metadata(metadata)
                    .build();

            wsNotificationService.sendToUser(assignedToUserId, wsNotification);

            log.info("Approval task assignment notification sent to user {} for {} request",
                    assignedToUserId, entityType);

        } catch (Exception e) { // Intentional broad catch — best-effort after-commit notification listener
            log.error("Error processing ApprovalTaskAssignedEvent for task {} assigned to user {}",
                    event.getAggregateId(), event.getAssignedToUserId(), e);
            // Don't propagate exception - event is already committed
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Handles approval decision events (APPROVED or REJECTED).
     * <p>
     * When an approval decision is made:
     * 1. A persistent notification is created and stored in the database
     * 2. A real-time WebSocket notification is pushed to the original requester
     *
     * @param event the approval decision event
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onApprovalDecision(ApprovalDecisionEvent event) {
        UUID tenantId = event.getTenantId();
        UUID requesterId = event.getRequesterId();

        if (requesterId == null) {
            log.warn("ApprovalDecisionEvent for instance {} has no requesterId — skipping requester notification",
                    event.getInstanceId());
            return;
        }

        try {
            // Set tenant context for notification operations
            TenantContext.setCurrentTenant(tenantId);

            UUID instanceId = event.getInstanceId();
            String action = event.getAction(); // APPROVED or REJECTED
            String module = event.getModule();
            String actorName = event.getActorName() != null ? event.getActorName() : "An approver";
            String moduleLabel = getEntityTypeLabel(module);

            // Build notification title and message
            boolean approved = "APPROVED".equals(action);
            String title = approved ? "Request Approved" : "Request Rejected";

            String message = String.format("Your %s request has been %s by %s",
                    moduleLabel, action.toLowerCase(), actorName);
            if (!approved && event.getComments() != null && !event.getComments().isBlank()) {
                message += String.format(". Reason: %s", event.getComments());
            }

            String actionUrl = buildActionUrl(module);

            // 1. Create persistent in-app notification for the requester
            Notification.NotificationType notifType = resolveNotificationType(module, approved);
            notificationService.createNotification(
                    requesterId,
                    notifType,
                    title,
                    message,
                    instanceId,
                    module,
                    actionUrl,
                    approved ? Notification.Priority.NORMAL : Notification.Priority.HIGH
            );
            log.debug("Persistent approval decision notification created for requester {} (instance: {})",
                    requesterId, instanceId);

            // 2. Send real-time WebSocket notification to requester
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("instanceId", instanceId.toString());
            metadata.put("module", module);
            metadata.put("action", action);
            metadata.put("actorName", actorName);
            if (event.getComments() != null) {
                metadata.put("comments", event.getComments());
            }
            metadata.put("decidedAt", LocalDateTime.now().toString());

            NotificationMessage wsNotification = NotificationMessage.builder()
                    .type(approved
                            ? NotificationMessage.NotificationType.APPROVAL_APPROVED
                            : NotificationMessage.NotificationType.APPROVAL_REJECTED)
                    .title(title)
                    .message(message)
                    .priority(approved
                            ? NotificationMessage.Priority.NORMAL
                            : NotificationMessage.Priority.HIGH)
                    .actionUrl(actionUrl)
                    .metadata(metadata)
                    .build();

            wsNotificationService.sendToUser(requesterId, wsNotification);

            // 3. Send Slack DM to requester if configured and email is available
            String requesterEmail = event.getRequesterEmail();
            if (requesterEmail != null && !requesterEmail.isBlank()) {
                String emoji = approved ? ":white_check_mark:" : ":x:";
                String slackMessage = String.format("%s *%s %s*\nYour %s request has been %s by *%s*.",
                        emoji, moduleLabel, action, moduleLabel.toLowerCase(), action.toLowerCase(), actorName);
                if (!approved && event.getComments() != null && !event.getComments().isBlank()) {
                    slackMessage += String.format("\n*Reason:* %s", event.getComments());
                }
                slackNotificationService.sendDirectMessage(requesterEmail, slackMessage, null);
            }

            log.info("Approval decision notification sent to requester {} for {} request (decision: {}, instance: {})",
                    requesterId, module, action, instanceId);

        } catch (Exception e) { // Intentional broad catch — best-effort after-commit notification listener
            log.error("Error processing ApprovalDecisionEvent for execution {}",
                    event.getInstanceId(), e);
            // Don't propagate exception - event is already committed
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Converts entity type to a human-readable label.
     */
    private String getEntityTypeLabel(String entityType) {
        if (entityType == null) return "Request";

        return switch (entityType.toUpperCase()) {
            case "LEAVE_REQUEST" -> "Leave Request";
            case "EXPENSE_CLAIM" -> "Expense Claim";
            case "ASSET_REQUEST" -> "Asset Request";
            case "TRAVEL_REQUEST" -> "Travel Request";
            case "RECRUITMENT_OFFER" -> "Recruitment Offer";
            default -> entityType.replace("_", " ");
        };
    }

    /**
     * Resolves the persistent notification type based on the workflow module and decision.
     * Maps to specific types where available (LEAVE, EXPENSE), falls back to APPROVAL_UPDATE.
     */
    private Notification.NotificationType resolveNotificationType(String module, boolean approved) {
        if (module == null) {
            return Notification.NotificationType.APPROVAL_UPDATE;
        }
        return switch (module.toUpperCase()) {
            case "LEAVE_REQUEST" -> approved
                    ? Notification.NotificationType.LEAVE_APPROVED
                    : Notification.NotificationType.LEAVE_REJECTED;
            case "EXPENSE_CLAIM" -> approved
                    ? Notification.NotificationType.EXPENSE_APPROVED
                    : Notification.NotificationType.EXPENSE_REJECTED;
            default -> Notification.NotificationType.APPROVAL_UPDATE;
        };
    }

    /**
     * Builds the action URL for the notification based on entity type.
     * Directs users to the appropriate approval inbox or module.
     */
    private String buildActionUrl(String entityType) {
        if (entityType == null) return "/approvals/inbox";

        return switch (entityType.toUpperCase()) {
            case "LEAVE_REQUEST" -> "/approvals/inbox?module=LEAVE";
            case "EXPENSE_CLAIM" -> "/approvals/inbox?module=EXPENSE";
            case "ASSET_REQUEST" -> "/approvals/inbox?module=ASSET";
            case "TRAVEL_REQUEST" -> "/approvals/inbox?module=TRAVEL";
            case "RECRUITMENT_OFFER" -> "/approvals/inbox?module=RECRUITMENT";
            default -> "/approvals/inbox";
        };
    }
}
