package com.hrms.application.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for WebSocket notification messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage {

    private UUID id;
    private NotificationType type;
    private String title;
    private String message;
    private Priority priority;
    private LocalDateTime timestamp;
    private String actionUrl;
    private Map<String, Object> metadata;
    private boolean read;

    public enum NotificationType {
        // Leave notifications
        LEAVE_REQUEST,
        LEAVE_APPROVED,
        LEAVE_REJECTED,
        LEAVE_CANCELLED,

        // Attendance notifications
        ATTENDANCE_REMINDER,
        ATTENDANCE_REGULARIZATION,
        ATTENDANCE_APPROVED,

        // Payroll notifications
        PAYSLIP_AVAILABLE,
        PAYROLL_PROCESSED,

        // Performance notifications
        REVIEW_PENDING,
        REVIEW_COMPLETED,
        GOAL_DEADLINE,

        // General notifications
        ANNOUNCEMENT,
        SYSTEM_ALERT,
        TASK_ASSIGNED,
        DOCUMENT_SHARED,
        BIRTHDAY_REMINDER,
        WORK_ANNIVERSARY
    }

    public enum Priority {
        LOW,
        NORMAL,
        HIGH,
        URGENT
    }
}
