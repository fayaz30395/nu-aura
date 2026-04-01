package com.hrms.api.notification.dto;

import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationChannelConfig;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationChannelConfigDto {

    private UUID id;

    @NotNull(message = "Channel is required")
    private NotificationChannel channel;

    private Boolean isEnabled;

    private String provider;

    // Email config
    private String emailFromAddress;
    private String emailFromName;
    private String emailReplyTo;

    // SMS config
    private String smsFromNumber;

    // Push config
    private String pushServerKey;
    private String pushSenderId;

    // Slack config
    private String slackWorkspaceId;
    private String slackDefaultChannel;

    // Teams config
    private String teamsWebhookUrl;
    private String teamsTenantId;

    // WhatsApp config
    private String whatsappBusinessId;
    private String whatsappPhoneNumberId;

    // Webhook config
    private String webhookUrl;
    private String webhookHeaders;

    // Rate limiting
    private Integer rateLimitPerMinute;
    private Integer rateLimitPerHour;
    private Integer rateLimitPerDay;

    // Retry config
    private Integer maxRetries;
    private Integer retryDelaySeconds;
    private Boolean exponentialBackoff;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static NotificationChannelConfigDto fromEntity(NotificationChannelConfig config) {
        return NotificationChannelConfigDto.builder()
                .id(config.getId())
                .channel(config.getChannel())
                .isEnabled(config.getIsEnabled())
                .provider(config.getProvider())
                .emailFromAddress(config.getEmailFromAddress())
                .emailFromName(config.getEmailFromName())
                .emailReplyTo(config.getEmailReplyTo())
                .smsFromNumber(config.getSmsFromNumber())
                .pushServerKey(config.getPushServerKey() != null ? "***" : null) // Mask sensitive
                .pushSenderId(config.getPushSenderId())
                .slackWorkspaceId(config.getSlackWorkspaceId())
                .slackDefaultChannel(config.getSlackDefaultChannel())
                .teamsWebhookUrl(config.getTeamsWebhookUrl() != null ? "***" : null) // Mask sensitive
                .teamsTenantId(config.getTeamsTenantId())
                .whatsappBusinessId(config.getWhatsappBusinessId())
                .whatsappPhoneNumberId(config.getWhatsappPhoneNumberId())
                .webhookUrl(config.getWebhookUrl())
                .webhookHeaders(config.getWebhookHeaders())
                .rateLimitPerMinute(config.getRateLimitPerMinute())
                .rateLimitPerHour(config.getRateLimitPerHour())
                .rateLimitPerDay(config.getRateLimitPerDay())
                .maxRetries(config.getMaxRetries())
                .retryDelaySeconds(config.getRetryDelaySeconds())
                .exponentialBackoff(config.getExponentialBackoff())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }
}
