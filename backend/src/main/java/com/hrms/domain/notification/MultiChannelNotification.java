package com.hrms.domain.notification;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "multi_channel_notifications", indexes = {
    @Index(name = "idx_mcn_recipient", columnList = "recipientId"),
    @Index(name = "idx_mcn_status", columnList = "status"),
    @Index(name = "idx_mcn_created", columnList = "createdAt"),
    @Index(name = "idx_mcn_channel", columnList = "channel")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MultiChannelNotification extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private NotificationTemplate template;

    private String templateCode;

    @Column(nullable = false)
    private UUID recipientId;

    private String recipientEmail;

    private String recipientPhone;

    private String recipientName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationStatus status;

    // Content (after template processing)
    @Column(length = 500)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    private String title;

    private String actionUrl;

    private String icon;

    // Context data
    @Column(columnDefinition = "TEXT")
    private String contextData; // JSON data used for template rendering

    // Reference
    private String referenceType; // LEAVE_REQUEST, PAYROLL_RUN, etc.

    private UUID referenceId;

    // Delivery tracking
    private LocalDateTime scheduledAt;

    private LocalDateTime sentAt;

    private LocalDateTime deliveredAt;

    private LocalDateTime readAt;

    private Integer retryCount;

    private LocalDateTime lastRetryAt;

    private String errorMessage;

    private String externalId; // Provider message ID

    // Grouping
    private String groupKey; // For notification grouping

    private Boolean isGroupSummary;

    private LocalDateTime createdAt;

    private UUID createdBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = NotificationStatus.PENDING;
        if (priority == null) priority = NotificationPriority.NORMAL;
        if (retryCount == null) retryCount = 0;
        if (isGroupSummary == null) isGroupSummary = false;
    }
}
