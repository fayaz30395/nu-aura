package com.hrms.domain.notification;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;


@Where(clause = "is_deleted = false")
@Entity
@Table(name = "notification_channel_configs", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"tenantId", "channel"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class NotificationChannelConfig extends TenantAware {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationChannel channel;

    private Boolean isEnabled;

    // Provider configuration
    private String provider; // SENDGRID, TWILIO, FIREBASE, etc.

    @Column(columnDefinition = "TEXT")
    private String configJson; // Encrypted provider configuration

    // Email specific
    private String emailFromAddress;

    private String emailFromName;

    private String emailReplyTo;

    // SMS specific
    private String smsFromNumber;

    // Push specific
    private String pushServerKey;

    private String pushSenderId;

    // Slack specific
    private String slackWorkspaceId;

    private String slackBotToken;

    private String slackDefaultChannel;

    // Teams specific
    private String teamsWebhookUrl;

    private String teamsTenantId;

    // WhatsApp specific
    private String whatsappBusinessId;

    private String whatsappPhoneNumberId;

    // Webhook specific
    private String webhookUrl;

    private String webhookSecret;

    @Column(columnDefinition = "TEXT")
    private String webhookHeaders; // JSON headers

    // Rate limiting
    private Integer rateLimitPerMinute;

    private Integer rateLimitPerHour;

    private Integer rateLimitPerDay;

    // Retry configuration
    private Integer maxRetries;

    private Integer retryDelaySeconds;

    private Boolean exponentialBackoff;

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    @PrePersist
    protected void onCreate() {
        if (isEnabled == null) isEnabled = true;
        if (maxRetries == null) maxRetries = 3;
        if (retryDelaySeconds == null) retryDelaySeconds = 60;
        if (exponentialBackoff == null) exponentialBackoff = true;
    }
}
