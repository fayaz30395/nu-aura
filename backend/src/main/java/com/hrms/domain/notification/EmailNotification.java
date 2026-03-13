package com.hrms.domain.notification;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_notifications", indexes = {
    @Index(name = "idx_email_tenant", columnList = "tenantId"),
    @Index(name = "idx_email_status", columnList = "status"),
    @Index(name = "idx_email_recipient", columnList = "recipientEmail")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmailNotification extends TenantAware {

    @Column(nullable = false, length = 100)
    private String recipientEmail;

    @Column(nullable = false, length = 200)
    private String recipientName;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EmailType emailType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmailStatus status;

    @Column
    private LocalDateTime sentAt;

    @Column
    private LocalDateTime scheduledAt;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column
    private Integer retryCount;

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON string for additional context

    public enum EmailType {
        LEAVE_APPROVAL,
        LEAVE_REJECTION,
        BIRTHDAY_REMINDER,
        ANNIVERSARY_REMINDER,
        PAYSLIP_READY,
        ANNOUNCEMENT,
        PASSWORD_RESET,
        WELCOME,
        EXIT_CONFIRMATION,
        EXPENSE_APPROVAL,
        EXPENSE_REJECTION,
        PERFORMANCE_REVIEW_DUE,
        ATTENDANCE_ALERT,
        DOCUMENT_UPLOAD_REMINDER,
        GENERAL
    }

    public enum EmailStatus {
        PENDING,
        SENT,
        FAILED,
        SCHEDULED
    }
}
