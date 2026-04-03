package com.hrms.api.mobile.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Container class for mobile notification DTOs.
 * This class has no fields - it only contains inner static classes.
 */
public final class MobileNotificationDto {

    private MobileNotificationDto() {
        // Private constructor to prevent instantiation
    }

    // ==================== DEVICE REGISTRATION ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeviceRegistrationRequest {
        @NotBlank(message = "Device token is required")
        private String deviceToken;

        @NotNull(message = "Device type is required")
        private String deviceType; // IOS, ANDROID, WEB

        private String deviceModel;
        private String osVersion;
        private String appVersion;

        @NotNull(message = "Is active is required")
        private Boolean isActive;
    }

    // ==================== UNREAD NOTIFICATION RESPONSE ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnreadNotificationsResponse {
        private Integer unreadCount;
        private List<NotificationItem> notifications;
    }

    // ==================== NOTIFICATION ITEM ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationItem {
        private UUID notificationId;
        private String type; // APPROVAL, LEAVE, ATTENDANCE, ANNOUNCEMENT, SYSTEM, etc.
        private String title;
        private String message;
        private String category; // Leave approval, Expense approval, etc.
        private LocalDateTime createdAt;
        private Boolean isRead;
        private String actionUrl; // Deep link to relevant screen
        private UUID relatedEntityId; // ID of leave request, expense, etc.
        private String icon;
        private String priority; // LOW, MEDIUM, HIGH
    }

    // ==================== MARK READ REQUEST ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkReadRequest {
        private List<UUID> notificationIds;
        private Boolean markAllAsRead;
    }

    // ==================== MARK READ RESPONSE ====================
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkReadResponse {
        private Integer updatedCount;
        private String message;
    }
}
