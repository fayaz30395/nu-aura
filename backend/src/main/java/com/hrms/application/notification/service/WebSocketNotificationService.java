package com.hrms.application.notification.service;

import com.hrms.application.notification.dto.NotificationMessage;
import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.websocket.RedisWebSocketRelay;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

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

    /**
     * Send notification to a specific user.
     */
    @Transactional
    public void sendToUser(UUID userId, NotificationMessage notification) {
        String destination = "/queue/notifications";
        notification.setTimestamp(LocalDateTime.now());
        notification.setId(UUID.randomUUID());

        redisWebSocketRelay.convertAndSendToUser(
                userId.toString(),
                destination,
                notification
        );

        log.debug("Sent WebSocket notification to user {}: {}", userId, notification.getTitle());
    }

    /**
     * Send notification to all users in a tenant.
     */
    @Transactional
    public void sendToTenant(UUID tenantId, NotificationMessage notification) {
        String destination = "/topic/tenant/" + tenantId + "/notifications";
        notification.setTimestamp(LocalDateTime.now());
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
        String destination = "/topic/department/" + departmentId + "/notifications";
        notification.setTimestamp(LocalDateTime.now());
        notification.setId(UUID.randomUUID());

        redisWebSocketRelay.convertAndSend(destination, notification);

        log.debug("Sent department notification to {}: {}", departmentId, notification.getTitle());
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
