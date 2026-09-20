package com.nulogic.application.notification.service;

import com.nulogic.application.notification.dto.NotificationMessage;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.notification.Notification;
import com.nulogic.infrastructure.notification.repository.NotificationRepository;
import com.nulogic.infrastructure.websocket.RedisWebSocketRelay;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for sending real-time notifications via WebSocket.
 * Complements NotificationService which handles database persistence.
 * This service pushes notifications to connected WebSocket clients in real-time.
 *
 * <p>Messages are published through {@link RedisWebSocketRelay} so that all pods
 * in a horizontally scaled deployment receive and deliver them to their local
 * WebSocket sessions.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final RedisWebSocketRelay redisWebSocketRelay;
    // S13 Wave-13: timestamp pushed to the client in the current tenant's zone. WS pushes are
    // always invoked from a request/scheduler frame that has TenantContext set; if it's missing
    // the resolver falls back to DEFAULT_ZONE rather than the JVM zone.
    private final TenantTimeService tenantTimeService;
    private final NotificationRepository notificationRepository;

    /**
     * Send notification to a specific user.
     */
    @Transactional
    public void sendToUser(UUID userId, NotificationMessage notification) {
        String destination = "/queue/notifications";
        notification.setTimestamp(tenantTimeService.now(TenantContext.getCurrentTenant()));
        notification.setId(UUID.randomUUID());

        redisWebSocketRelay.convertAndSendToUser(
                userId.toString(),
                destination,
                notification
        );

        // Persist a durable in-app notification so it survives when the user is
        // offline — the real-time push above only reaches connected sessions.
        persistQuietly(userId, notification);

        log.debug("Sent WebSocket notification to user {}: {}", userId, notification.getTitle());
    }

    /**
     * Persist the notification for the bell / unread-count. Guarded: a persistence
     * failure must never break real-time delivery or the triggering operation.
     */
    private void persistQuietly(UUID userId, NotificationMessage message) {
        try {
            Notification entity = Notification.builder()
                    .userId(userId)
                    .type(mapType(message.getType()))
                    .title(message.getTitle())
                    .message(message.getMessage())
                    .actionUrl(message.getActionUrl())
                    .priority(mapPriority(message.getPriority()))
                    .isRead(false)
                    .build();
            entity.setTenantId(TenantContext.requireCurrentTenant());
            notificationRepository.save(entity);
        } catch (Exception e) {
            log.warn("Failed to persist in-app notification for user {}: {}", userId, e.getMessage());
        }
    }

    private Notification.NotificationType mapType(NotificationMessage.NotificationType type) {
        if (type == null) {
            return Notification.NotificationType.GENERAL;
        }
        try {
            return Notification.NotificationType.valueOf(type.name());
        } catch (IllegalArgumentException ex) {
            return Notification.NotificationType.GENERAL;
        }
    }

    private Notification.Priority mapPriority(NotificationMessage.Priority priority) {
        if (priority == null) {
            return Notification.Priority.NORMAL;
        }
        try {
            return Notification.Priority.valueOf(priority.name());
        } catch (IllegalArgumentException ex) {
            return Notification.Priority.NORMAL;
        }
    }

    /**
     * Send notification to all users in a tenant.
     */
    @Transactional
    public void sendToTenant(UUID tenantId, NotificationMessage notification) {
        String destination = "/topic/tenant/" + tenantId + "/notifications";
        // S13 Wave-13: explicit tenant arg drives the zone — no TenantContext lookup needed.
        notification.setTimestamp(tenantTimeService.now(tenantId));
        notification.setId(UUID.randomUUID());

        redisWebSocketRelay.convertAndSend(destination, notification);

        log.debug("Sent tenant notification to {}: {}", tenantId, notification.getTitle());
    }

    /**
     * Send notification to all users in current tenant.
     */
    @Transactional
    public void sendToCurrentTenant(NotificationMessage notification) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null) {
            sendToTenant(tenantId, notification);
        }
    }

    /**
     * Send notification to a specific department.
     */
    @Transactional
    public void sendToDepartment(UUID departmentId, NotificationMessage notification) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        String destination = "/topic/tenant/" + tenantId + "/department/" + departmentId + "/notifications";
        notification.setTimestamp(tenantTimeService.now(tenantId));
        notification.setId(UUID.randomUUID());

        redisWebSocketRelay.convertAndSend(destination, notification);

        log.debug("Sent department notification to tenant {} department {}: {}",
                tenantId, departmentId, notification.getTitle());
    }

    /**
     * Broadcast notification to all connected users in the current tenant.
     * Falls back to tenant-scoped broadcast via {@link #sendToCurrentTenant(NotificationMessage)}.
     */
    public void broadcast(NotificationMessage notification) {
        // Delegate to tenant-scoped broadcast to enforce tenant isolation.
        // A global /topic/broadcast without tenantId would leak messages across tenants.
        sendToCurrentTenant(notification);
    }

    // ======================== Convenience Methods ========================

    /**
     * Send leave request notification to approver.
     */
    public void notifyLeaveRequestSubmitted(UUID approverId, String employeeName, String leaveType, String dates) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.LEAVE_REQUEST)
                .title("New Leave Request")
                .message(String.format("%s has requested %s leave for %s", employeeName, leaveType, dates))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/leave/pending")
                .build();

        sendToUser(approverId, notification);
    }

    /**
     * Send leave approval notification to employee.
     */
    public void notifyLeaveApproved(UUID employeeId, String leaveType, String dates) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.LEAVE_APPROVED)
                .title("Leave Request Approved")
                .message(String.format("Your %s leave for %s has been approved", leaveType, dates))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/leave/my-requests")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send leave rejection notification to employee.
     */
    public void notifyLeaveRejected(UUID employeeId, String leaveType, String reason) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.LEAVE_REJECTED)
                .title("Leave Request Rejected")
                .message(String.format("Your %s leave request was rejected: %s", leaveType, reason))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/leave/my-requests")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send leave cancellation notification to the employee's manager.
     */
    public void notifyLeaveCancelled(UUID managerId, String employeeName, String leaveType, String dates) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.LEAVE_CANCELLED)
                .title("Leave Request Cancelled")
                .message(String.format("%s cancelled their %s leave for %s", employeeName, leaveType, dates))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/leave/pending")
                .build();

        sendToUser(managerId, notification);
    }

    /**
     * Send goal created notification to the employee the goal was set for.
     */
    public void notifyGoalCreated(UUID employeeId, String goalTitle) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.GOAL_CREATED)
                .title("New Goal Assigned")
                .message(String.format("A new goal has been set: %s", goalTitle))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/goals")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send goal updated notification to the employee the goal belongs to.
     */
    public void notifyGoalUpdated(UUID employeeId, String goalTitle) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.GOAL_UPDATED)
                .title("Goal Updated")
                .message(String.format("Your goal \"%s\" has been updated", goalTitle))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/goals")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send review-started notification to the assigned reviewer (self or manager).
     */
    public void notifyReviewStarted(UUID reviewerId, String employeeName) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.REVIEW_PENDING)
                .title("Performance Review Started")
                .message(String.format("A performance review for %s is ready for your input", employeeName))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/performance/reviews")
                .build();

        sendToUser(reviewerId, notification);
    }

    /**
     * Send document-uploaded notification to the employee a document was added for.
     */
    public void notifyDocumentUploaded(UUID employeeId, String fileName) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.DOCUMENT_UPLOADED)
                .title("Document Uploaded")
                .message(String.format("A new document was added to your profile: %s", fileName))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/employees/me?tab=documents")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send training enrollment notification to the enrolled employee.
     */
    public void notifyTrainingEnrolled(UUID employeeId, String programName) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.TRAINING_ENROLLED)
                .title("Enrolled in Training")
                .message(String.format("You have been enrolled in: %s", programName))
                .priority(NotificationMessage.Priority.NORMAL)
                .actionUrl("/training")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send attendance reminder notification.
     */
    public void notifyAttendanceReminder(UUID employeeId) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.ATTENDANCE_REMINDER)
                .title("Attendance Reminder")
                .message("Don't forget to mark your attendance for today!")
                .priority(NotificationMessage.Priority.LOW)
                .actionUrl("/attendance")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send payroll processing complete notification to the user who triggered processing.
     */
    public void notifyPayrollProcessed(UUID triggeredBy, String period, int totalEmployees) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.PAYROLL_PROCESSED)
                .title("Payroll Processing Complete")
                .message(String.format(
                        "Payroll run for %s has been processed successfully. Total employees: %d.",
                        period, totalEmployees))
                .priority(NotificationMessage.Priority.HIGH)
                .actionUrl("/payroll/runs")
                .build();

        sendToUser(triggeredBy, notification);
    }

    /**
     * Send payslip available notification.
     */
    public void notifyPayslipAvailable(UUID employeeId, String month, String year) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.PAYSLIP_AVAILABLE)
                .title("Payslip Available")
                .message(String.format("Your payslip for %s %s is now available", month, year))
                .priority(NotificationMessage.Priority.HIGH)
                .actionUrl("/payroll/payslips")
                .build();

        sendToUser(employeeId, notification);
    }

    /**
     * Send announcement to entire tenant.
     */
    @Transactional
    public void sendAnnouncement(String title, String message, NotificationMessage.Priority priority) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.ANNOUNCEMENT)
                .title(title)
                .message(message)
                .priority(priority)
                .build();

        sendToCurrentTenant(notification);
    }

    /**
     * Send system alert (admin only).
     */
    @Transactional
    public void sendSystemAlert(UUID adminId, String title, String message) {
        NotificationMessage notification = NotificationMessage.builder()
                .type(NotificationMessage.NotificationType.SYSTEM_ALERT)
                .title(title)
                .message(message)
                .priority(NotificationMessage.Priority.URGENT)
                .build();

        sendToUser(adminId, notification);
    }
}
