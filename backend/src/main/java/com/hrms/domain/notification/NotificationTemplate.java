package com.hrms.domain.notification;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "notification_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class NotificationTemplate extends TenantAware {

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String category; // LEAVE, ATTENDANCE, PAYROLL, PERFORMANCE, etc.

    @Column(nullable = false)
    private String eventType; // LEAVE_APPROVED, PAYROLL_PROCESSED, etc.

    // Email template
    @Column(length = 500)
    private String emailSubject;

    @Column(columnDefinition = "TEXT")
    private String emailBody;

    private Boolean emailHtml;

    // SMS template
    @Column(length = 500)
    private String smsBody;

    // Push notification
    @Column(length = 200)
    private String pushTitle;

    @Column(length = 500)
    private String pushBody;

    private String pushIcon;

    private String pushAction; // Deep link or action

    // In-app notification
    @Column(length = 200)
    private String inAppTitle;

    @Column(length = 1000)
    private String inAppBody;

    private String inAppIcon;

    private String inAppActionUrl;

    // Slack template
    @Column(columnDefinition = "TEXT")
    private String slackMessage;

    // Teams template
    @Column(columnDefinition = "TEXT")
    private String teamsMessage;

    // WhatsApp template
    private String whatsappTemplateId;

    @Column(columnDefinition = "TEXT")
    private String whatsappBody;

    // Webhook template
    @Column(columnDefinition = "TEXT")
    private String webhookPayload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationPriority defaultPriority;

    @ElementCollection
    @CollectionTable(name = "notification_template_channels", joinColumns = @JoinColumn(name = "template_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "channel")
    @Builder.Default
    private Set<NotificationChannel> enabledChannels = new HashSet<>();

    private Boolean isActive;

    private Boolean isSystemTemplate; // Cannot be deleted by users

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    @PrePersist
    protected void onCreate() {
        if (isActive == null) isActive = true;
        if (isSystemTemplate == null) isSystemTemplate = false;
        if (emailHtml == null) emailHtml = true;
        if (defaultPriority == null) defaultPriority = NotificationPriority.NORMAL;
    }
}
