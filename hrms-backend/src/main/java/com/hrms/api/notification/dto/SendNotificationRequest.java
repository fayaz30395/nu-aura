package com.hrms.api.notification.dto;

import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationPriority;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendNotificationRequest {

    // Use template or provide content directly
    private String templateCode;

    // Direct content (if no template)
    private String subject;
    private String body;
    private String title;
    private String actionUrl;
    private String icon;

    // Recipients
    @NotNull(message = "At least one recipient is required")
    private List<RecipientInfo> recipients;

    // Channels to send through (if not specified, uses template defaults)
    private Set<NotificationChannel> channels;

    private NotificationPriority priority;

    // Context data for template rendering
    private Map<String, Object> contextData;

    // Reference info
    private String referenceType;
    private UUID referenceId;

    // Scheduling
    private LocalDateTime scheduledAt;

    // Grouping
    private String groupKey;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecipientInfo {
        @NotNull(message = "Recipient ID is required")
        private UUID userId;
        private String email;
        private String phone;
        private String name;
        private String slackUserId;
        private String teamsUserId;
    }
}
