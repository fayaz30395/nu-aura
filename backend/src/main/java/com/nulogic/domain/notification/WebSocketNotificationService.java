package com.nulogic.domain.notification;

import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.notification.repository.NotificationRepository;
import com.nulogic.infrastructure.websocket.RedisWebSocketRelay;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service("domainWebSocketNotificationService")
@RequiredArgsConstructor
public class WebSocketNotificationService {

    private final RedisWebSocketRelay redisWebSocketRelay;
    // Persist directly through the repository (a leaf bean) rather than the
    // application NotificationService, to avoid any cross-layer startup cycle.
    private final NotificationRepository notificationRepository;

    /**
     * Send a notification to a specific user via user-destination (private queue),
     * and persist a durable in-app notification so it survives when the user is
     * offline (the real-time push only reaches connected WebSocket sessions).
     * Persistence failures are logged and swallowed — they must never break the
     * triggering operation or the real-time delivery.
     */
    @Transactional
    public void sendToUser(String userId, NotificationMessage message) {
        redisWebSocketRelay.convertAndSendToUser(userId, "/queue/notifications", message);
        persistQuietly(userId, message);
    }

    /**
     * Broadcast a message to all users within a specific tenant.
     * Includes tenantId in the topic path to enforce tenant isolation.
     *
     * @param tenantId the tenant to broadcast to
     * @param message  the notification message
     */
    public void broadcast(UUID tenantId, NotificationMessage message) {
        redisWebSocketRelay.convertAndSend("/topic/tenant/" + tenantId + "/broadcast", message);
    }

    private void persistQuietly(String userId, NotificationMessage message) {
        try {
            Notification notification = Notification.builder()
                    .userId(UUID.fromString(userId))
                    .type(mapType(message.getType()))
                    .title(message.getTitle())
                    .message(message.getMessage())
                    .priority(Notification.Priority.NORMAL)
                    .isRead(false)
                    .build();
            notification.setTenantId(TenantContext.requireCurrentTenant());
            notificationRepository.save(notification);
        } catch (Exception e) {
            log.warn("Failed to persist in-app notification for user {}: {}", userId, e.getMessage());
        }
    }

    /** Map the free-form WS message type string to the persisted enum, defaulting to GENERAL. */
    private Notification.NotificationType mapType(String type) {
        if (type == null || type.isBlank()) {
            return Notification.NotificationType.GENERAL;
        }
        try {
            return Notification.NotificationType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Notification.NotificationType.GENERAL;
        }
    }
}
