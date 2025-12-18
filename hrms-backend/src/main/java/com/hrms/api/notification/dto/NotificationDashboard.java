package com.hrms.api.notification.dto;

import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDashboard {

    // Overview
    private Long totalNotificationsSent;
    private Long totalNotificationsDelivered;
    private Long totalNotificationsFailed;
    private Double deliveryRate;

    // By Channel
    private Map<NotificationChannel, ChannelStats> channelStats;

    // By Status
    private Map<NotificationStatus, Long> statusCounts;

    // Recent Activity
    private List<RecentNotification> recentNotifications;

    // Performance
    private Double averageDeliveryTimeMs;
    private Long pendingNotifications;
    private Long scheduledNotifications;

    // Top Templates
    private List<TemplateUsage> topTemplates;

    // Channel Health
    private List<ChannelHealth> channelHealth;

    // Time-based stats
    private List<HourlyStats> hourlyStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelStats {
        private NotificationChannel channel;
        private Long totalSent;
        private Long delivered;
        private Long failed;
        private Double deliveryRate;
        private Double averageDeliveryTimeMs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentNotification {
        private String templateCode;
        private NotificationChannel channel;
        private String recipientName;
        private NotificationStatus status;
        private LocalDateTime sentAt;
        private String errorMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateUsage {
        private String templateCode;
        private String templateName;
        private Long usageCount;
        private Double deliveryRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelHealth {
        private NotificationChannel channel;
        private String provider;
        private Boolean isEnabled;
        private Boolean isHealthy;
        private String lastError;
        private LocalDateTime lastSuccessfulDelivery;
        private Integer failedInLast24h;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HourlyStats {
        private Integer hour;
        private Long sent;
        private Long delivered;
        private Long failed;
    }
}
