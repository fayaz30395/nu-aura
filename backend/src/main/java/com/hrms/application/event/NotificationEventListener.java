package com.hrms.application.event;

import com.hrms.application.notification.dto.NotificationMessage;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.event.expense.ExpenseSubmittedEvent;
import com.hrms.domain.event.leave.LeaveRequestedEvent;
import com.hrms.domain.event.workflow.ApprovalTaskAssignedEvent;
import com.hrms.domain.notification.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

/**
 * Listens for domain events and creates in-app notification records.
 *
 * <p>Uses @TransactionalEventListener with AFTER_COMMIT to ensure notifications
 * are only created after the originating transaction commits successfully.</p>
 *
 * <p>Handles three event types as specified by the Agent D task:</p>
 * <ul>
 *   <li>leave.requested → notify manager about the leave application</li>
 *   <li>expense.submitted → notify approver about the expense claim</li>
 *   <li>approval.task.assigned → notify the assigned user about a pending approval</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final WebSocketNotificationService webSocketNotificationService;

    // ==================== Leave Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeaveRequested(LeaveRequestedEvent event) {
        log.info("Handling LeaveRequestedEvent: {} applied for {} leave ({} to {})",
                event.getRequesterName(), event.getLeaveType(),
                event.getStartDate(), event.getEndDate());

        UUID recipientUserId = event.getManagerId();
        if (recipientUserId == null) {
            log.warn("No manager assigned for employee {}; skipping leave notification", event.getEmployeeId());
            return;
        }

        String title = "Leave Request";
        String message = String.format("%s applied for %s leave from %s to %s",
                event.getRequesterName(), event.getLeaveType(),
                event.getStartDate(), event.getEndDate());

        createAndPushNotification(
                event.getTenantId(),
                recipientUserId,
                Notification.NotificationType.LEAVE_PENDING,
                title,
                message,
                event.getAggregateId(),
                "LeaveRequest",
                "/leave/approvals",
                Notification.Priority.NORMAL
        );
    }

    // ==================== Expense Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onExpenseSubmitted(ExpenseSubmittedEvent event) {
        log.info("Handling ExpenseSubmittedEvent: {} submitted expense of {} {}",
                event.getRequesterName(), event.getAmount(), event.getCurrency());

        UUID recipientUserId = event.getApproverId();
        if (recipientUserId == null) {
            log.warn("No approver assigned for expense {}; skipping notification", event.getAggregateId());
            return;
        }

        String title = "Expense Submitted";
        String message = String.format("%s submitted an expense of %s %s for approval",
                event.getRequesterName(), event.getCurrency(), event.getAmount().toPlainString());

        createAndPushNotification(
                event.getTenantId(),
                recipientUserId,
                Notification.NotificationType.EXPENSE_APPROVED,  // closest existing type for expense events
                title,
                message,
                event.getAggregateId(),
                "ExpenseClaim",
                "/expenses/approvals",
                Notification.Priority.NORMAL
        );
    }

    // ==================== Workflow / Approval Events ====================

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onApprovalTaskAssigned(ApprovalTaskAssignedEvent event) {
        log.info("Handling ApprovalTaskAssignedEvent: {} approval from {} assigned to user {}",
                event.getEntityType(), event.getRequesterName(), event.getAssignedToUserId());

        String title = "Pending Approval";
        String message = String.format("You have a pending %s approval request from %s",
                event.getEntityType(), event.getRequesterName());

        createAndPushNotification(
                event.getTenantId(),
                event.getAssignedToUserId(),
                Notification.NotificationType.GENERAL,
                title,
                message,
                event.getAggregateId(),
                event.getEntityType(),
                "/approvals",
                Notification.Priority.HIGH
        );
    }

    // ==================== Helper ====================

    /**
     * Creates a persisted notification record and pushes it via WebSocket
     * for real-time delivery.
     */
    private void createAndPushNotification(UUID tenantId, UUID recipientUserId,
                                           Notification.NotificationType type,
                                           String title, String message,
                                           UUID relatedEntityId, String relatedEntityType,
                                           String actionUrl, Notification.Priority priority) {
        try {
            // Set tenant context for the notification service
            TenantContext.setCurrentTenant(tenantId);

            Notification notification = notificationService.createNotification(
                    recipientUserId, type, title, message,
                    relatedEntityId, relatedEntityType, actionUrl, priority);

            // Push real-time via WebSocket using the NotificationMessage DTO
            try {
                NotificationMessage wsMessage = NotificationMessage.builder()
                        .type(mapToWsType(type))
                        .title(title)
                        .message(message)
                        .priority(mapToWsPriority(priority))
                        .actionUrl(actionUrl)
                        .read(false)
                        .build();
                webSocketNotificationService.sendToUser(recipientUserId, wsMessage);
            } catch (Exception wsEx) {
                log.warn("Failed to send WebSocket notification to user {}: {}",
                        recipientUserId, wsEx.getMessage());
                // Non-fatal — the persisted notification will be picked up by REST polling
            }

            log.debug("Notification created: id={} type={} recipient={}",
                    notification.getId(), type, recipientUserId);
        } catch (Exception ex) {
            log.error("Failed to create notification for user {}: {}",
                    recipientUserId, ex.getMessage(), ex);
        } finally {
            TenantContext.clear();
        }
    }

    /** Maps domain NotificationType to WebSocket NotificationMessage.NotificationType. */
    private NotificationMessage.NotificationType mapToWsType(Notification.NotificationType type) {
        return switch (type) {
            case LEAVE_PENDING -> NotificationMessage.NotificationType.LEAVE_REQUEST;
            case LEAVE_APPROVED -> NotificationMessage.NotificationType.LEAVE_APPROVED;
            case LEAVE_REJECTED -> NotificationMessage.NotificationType.LEAVE_REJECTED;
            case EXPENSE_APPROVED, EXPENSE_REJECTED -> NotificationMessage.NotificationType.TASK_ASSIGNED;
            case PAYROLL_GENERATED -> NotificationMessage.NotificationType.PAYROLL_PROCESSED;
            case ANNOUNCEMENT -> NotificationMessage.NotificationType.ANNOUNCEMENT;
            case SYSTEM_ALERT -> NotificationMessage.NotificationType.SYSTEM_ALERT;
            default -> NotificationMessage.NotificationType.SYSTEM_ALERT;
        };
    }

    /** Maps domain Priority to WebSocket NotificationMessage.Priority. */
    private NotificationMessage.Priority mapToWsPriority(Notification.Priority priority) {
        return switch (priority) {
            case LOW -> NotificationMessage.Priority.LOW;
            case NORMAL -> NotificationMessage.Priority.NORMAL;
            case HIGH -> NotificationMessage.Priority.HIGH;
            case URGENT -> NotificationMessage.Priority.URGENT;
        };
    }
}
