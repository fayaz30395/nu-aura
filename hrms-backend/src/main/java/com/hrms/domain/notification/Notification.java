package com.hrms.domain.notification;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_user", columnList = "userId"),
    @Index(name = "idx_notification_tenant", columnList = "tenantId"),
    @Index(name = "idx_notification_read", columnList = "isRead"),
    @Index(name = "idx_notification_created", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification extends TenantAware {

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column
    private UUID relatedEntityId;

    @Column(length = 100)
    private String relatedEntityType; // e.g., "LEAVE_REQUEST", "ATTENDANCE", "PAYROLL"

    @Column(length = 500)
    private String actionUrl;

    @Column(nullable = false)
    private Boolean isRead = false;

    @Column
    private LocalDateTime readAt;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Priority priority = Priority.NORMAL;

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON string for additional context

    public enum NotificationType {
        LEAVE_APPROVED,
        LEAVE_REJECTED,
        LEAVE_PENDING,
        ATTENDANCE_MARKED,
        ATTENDANCE_ALERT,
        PAYROLL_GENERATED,
        DOCUMENT_UPLOADED,
        DOCUMENT_REQUIRED,
        ANNOUNCEMENT,
        BIRTHDAY,
        ANNIVERSARY,
        PERFORMANCE_REVIEW_DUE,
        EXPENSE_APPROVED,
        EXPENSE_REJECTED,
        SHIFT_ASSIGNED,
        SHIFT_CHANGED,
        ROLE_UPDATED,
        SYSTEM_ALERT,
        GENERAL
    }

    public enum Priority {
        LOW,
        NORMAL,
        HIGH,
        URGENT
    }

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}
