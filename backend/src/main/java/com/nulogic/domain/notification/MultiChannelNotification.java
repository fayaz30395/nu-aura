package com.nulogic.domain.notification;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Migrated to the {@link TimeAuditingEntityListener} seam — see
 * {@code backend/docs/audit/prepersist-now-audit.md} row 9 and the pilot at
 * {@link com.nulogic.domain.recognition.RecognitionReaction}. {@code createdAt} is now
 * stamped from the tenant's zone via {@link TenantTimestamp} rather than the JVM default
 * zone {@code LocalDateTime.now()}.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "multi_channel_notifications", indexes = {
        @Index(name = "idx_mcn_recipient", columnList = "recipient_id"),
        @Index(name = "idx_mcn_status", columnList = "status"),
        @Index(name = "idx_mcn_created", columnList = "created_at"),
        @Index(name = "idx_mcn_channel", columnList = "channel")
})
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
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

    @TenantTimestamp
    private LocalDateTime createdAt;

    private UUID createdBy;

    /**
     * Defaults remain in-entity because the {@link TimeAuditingEntityListener} seam only
     * handles timestamp fields; the audit explicitly preserves non-temporal defaults during
     * the rollout (see {@code prepersist-now-audit.md} §"Patterns observed").
     */
    @PrePersist
    protected void onCreate() {
        if (status == null) status = NotificationStatus.PENDING;
        if (priority == null) priority = NotificationPriority.NORMAL;
        if (retryCount == null) retryCount = 0;
        if (isGroupSummary == null) isGroupSummary = false;
    }
}
