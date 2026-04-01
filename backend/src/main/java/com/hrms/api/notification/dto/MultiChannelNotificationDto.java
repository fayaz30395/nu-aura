package com.hrms.api.notification.dto;

import com.hrms.domain.notification.*;
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
public class MultiChannelNotificationDto {

    private UUID id;
    private String templateCode;
    private UUID recipientId;
    private String recipientEmail;
    private String recipientPhone;
    private String recipientName;
    private NotificationChannel channel;
    private NotificationPriority priority;
    private NotificationStatus status;

    private String subject;
    private String body;
    private String title;
    private String actionUrl;
    private String icon;

    private String contextData;
    private String referenceType;
    private UUID referenceId;

    private LocalDateTime scheduledAt;
    private LocalDateTime sentAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;

    private Integer retryCount;
    private String errorMessage;
    private String externalId;

    private String groupKey;
    private Boolean isGroupSummary;

    private LocalDateTime createdAt;

    public static MultiChannelNotificationDto fromEntity(MultiChannelNotification notification) {
        return MultiChannelNotificationDto.builder()
                .id(notification.getId())
                .templateCode(notification.getTemplateCode())
                .recipientId(notification.getRecipientId())
                .recipientEmail(notification.getRecipientEmail())
                .recipientPhone(notification.getRecipientPhone())
                .recipientName(notification.getRecipientName())
                .channel(notification.getChannel())
                .priority(notification.getPriority())
                .status(notification.getStatus())
                .subject(notification.getSubject())
                .body(notification.getBody())
                .title(notification.getTitle())
                .actionUrl(notification.getActionUrl())
                .icon(notification.getIcon())
                .contextData(notification.getContextData())
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId())
                .scheduledAt(notification.getScheduledAt())
                .sentAt(notification.getSentAt())
                .deliveredAt(notification.getDeliveredAt())
                .readAt(notification.getReadAt())
                .retryCount(notification.getRetryCount())
                .errorMessage(notification.getErrorMessage())
                .externalId(notification.getExternalId())
                .groupKey(notification.getGroupKey())
                .isGroupSummary(notification.getIsGroupSummary())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
