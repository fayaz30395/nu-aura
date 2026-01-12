package com.hrms.api.notification.dto;

import com.hrms.domain.notification.Notification;
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
public class NotificationResponse {
    private UUID id;
    private UUID userId;
    private String type;
    private String title;
    private String message;
    private UUID relatedEntityId;
    private String relatedEntityType;
    private String actionUrl;
    private Boolean isRead;
    private LocalDateTime readAt;
    private String priority;
    private String metadata;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static NotificationResponse fromEntity(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .type(notification.getType().name())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .relatedEntityId(notification.getRelatedEntityId())
                .relatedEntityType(notification.getRelatedEntityType())
                .actionUrl(notification.getActionUrl())
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .priority(notification.getPriority().name())
                .metadata(notification.getMetadata())
                .createdAt(notification.getCreatedAt())
                .updatedAt(notification.getUpdatedAt())
                .build();
    }
}
