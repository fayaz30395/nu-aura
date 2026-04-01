package com.hrms.api.notification.dto;

import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationPriority;
import com.hrms.domain.notification.NotificationTemplate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateDto {

    private UUID id;

    @NotBlank(message = "Template code is required")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "Template name is required")
    @Size(max = 200)
    private String name;

    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Event type is required")
    private String eventType;

    // Email
    private String emailSubject;
    private String emailBody;
    private Boolean emailHtml;

    // SMS
    private String smsBody;

    // Push
    private String pushTitle;
    private String pushBody;
    private String pushIcon;
    private String pushAction;

    // In-App
    private String inAppTitle;
    private String inAppBody;
    private String inAppIcon;
    private String inAppActionUrl;

    // Slack
    private String slackMessage;

    // Teams
    private String teamsMessage;

    // WhatsApp
    private String whatsappTemplateId;
    private String whatsappBody;

    // Webhook
    private String webhookPayload;

    private NotificationPriority defaultPriority;
    private Set<NotificationChannel> enabledChannels;
    private Boolean isActive;
    private Boolean isSystemTemplate;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static NotificationTemplateDto fromEntity(NotificationTemplate template) {
        return NotificationTemplateDto.builder()
                .id(template.getId())
                .code(template.getCode())
                .name(template.getName())
                .description(template.getDescription())
                .category(template.getCategory())
                .eventType(template.getEventType())
                .emailSubject(template.getEmailSubject())
                .emailBody(template.getEmailBody())
                .emailHtml(template.getEmailHtml())
                .smsBody(template.getSmsBody())
                .pushTitle(template.getPushTitle())
                .pushBody(template.getPushBody())
                .pushIcon(template.getPushIcon())
                .pushAction(template.getPushAction())
                .inAppTitle(template.getInAppTitle())
                .inAppBody(template.getInAppBody())
                .inAppIcon(template.getInAppIcon())
                .inAppActionUrl(template.getInAppActionUrl())
                .slackMessage(template.getSlackMessage())
                .teamsMessage(template.getTeamsMessage())
                .whatsappTemplateId(template.getWhatsappTemplateId())
                .whatsappBody(template.getWhatsappBody())
                .webhookPayload(template.getWebhookPayload())
                .defaultPriority(template.getDefaultPriority())
                .enabledChannels(template.getEnabledChannels())
                .isActive(template.getIsActive())
                .isSystemTemplate(template.getIsSystemTemplate())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }
}
