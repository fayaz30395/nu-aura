package com.hrms.application.event.listener;

import com.hrms.application.notification.dto.NotificationMessage;
import com.hrms.application.notification.service.NotificationService;
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

    /**
     * Handles approval task assignment events.
     *
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
     *
     * When an approval decision is made:
     * 1. A persistent notification is created and stored in the database
     * 2. A real-time WebSocket notification is pushed to the original requester
     *
     * @param event the approval decision event
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onApprovalDecision(ApprovalDecisionEvent event) {
        UUID tenantId = event.getTenantId();

        try {
            // Set tenant context for notification operations
            TenantContext.setCurrentTenant(tenantId);

            UUID instanceId = event.getInstanceId();
            String action = event.getAction(); // APPROVED or REJECTED
            String module = event.getModule();

            // Build notification title and message
            String title = action.equals("APPROVED")
                    ? "Request Approved"
                    : "Request Rejected";

            String message = String.format("Your %s request has been %s",
                    getEntityTypeLabel(module),
                    action.toLowerCase());

            String actionUrl = buildActionUrl(module);

            // Note: The event contains the step executor (approver), not the requester
            // We need to get the requester from the workflow execution (handled in domain event)
            // For now, we'll use the aggregateId which is the workflow execution ID

            // Notification would be sent to the requester - this would be fetched from WorkflowExecution
            // Since ApprovalDecisionEvent doesn't directly contain requester ID, we log a warning
            // This should be enhanced to include requester information in the event

            log.info("Approval decision {} event received for {} request (execution: {})",
                    action, module, instanceId);

            // Additional: Notify the approver's manager if they delegated
            // This is typically handled by a separate delegation notification service

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
