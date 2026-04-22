package com.hrms.application.mobile.service;

import com.hrms.api.mobile.dto.MobileNotificationDto;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MobileNotificationService {

    /**
     * Register device for push notifications
     */
    @Transactional
    public void registerDevice(MobileNotificationDto.DeviceRegistrationRequest request) {
        TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        log.info("Registering device for user={}, deviceType={}, appVersion={}",
                userId, request.getDeviceType(), request.getAppVersion());

        // Store device registration in database
        // Integrate with actual notification service for FCM/APNs integration
        // This is a placeholder implementation
    }

    /**
     * Get unread notifications
     */
    @Transactional(readOnly = true)
    public MobileNotificationDto.UnreadNotificationsResponse getUnreadNotifications() {
        TenantContext.getCurrentTenant();
        SecurityContext.getCurrentUserId();

        // Fetch unread notifications from database
        // This is a placeholder - integrate with actual notification service
        List<MobileNotificationDto.NotificationItem> notifications = new ArrayList<>();

        // Add sample notifications
        notifications.add(MobileNotificationDto.NotificationItem.builder()
                .notificationId(UUID.randomUUID())
                .type("APPROVAL")
                .title("Leave Request Approved")
                .message("Your leave request for March 15-17 has been approved")
                .category("Leave approval")
                .createdAt(LocalDateTime.now().minusHours(2))
                .isRead(false)
                .priority("HIGH")
                .build());

        return MobileNotificationDto.UnreadNotificationsResponse.builder()
                .unreadCount(notifications.size())
                .notifications(notifications.stream().limit(10).toList())
                .build();
    }

    /**
     * Mark notifications as read
     */
    @Transactional
    public MobileNotificationDto.MarkReadResponse markNotificationsAsRead(
            MobileNotificationDto.MarkReadRequest request) {
        int updatedCount = 0;

        if (Boolean.TRUE.equals(request.getMarkAllAsRead())) {
            // Mark all notifications as read for this user
            // Placeholder - integrate with actual implementation
            updatedCount = 10; // Mock value
        } else if (request.getNotificationIds() != null && !request.getNotificationIds().isEmpty()) {
            // Mark specific notifications as read
            updatedCount = request.getNotificationIds().size();
        }

        return MobileNotificationDto.MarkReadResponse.builder()
                .updatedCount(updatedCount)
                .message("Marked " + updatedCount + " notification(s) as read")
                .build();
    }
}
