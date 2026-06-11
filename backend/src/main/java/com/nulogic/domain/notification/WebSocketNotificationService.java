package com.nulogic.domain.notification;

import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.infrastructure.websocket.RedisWebSocketRelay;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service("domainWebSocketNotificationService")
public class WebSocketNotificationService {

    private final RedisWebSocketRelay redisWebSocketRelay;
    private final NotificationService notificationService;

    // @Lazy on the persistence service avoids any chance of a circular bean
    // graph at startup; it is only resolved on first notification dispatch.
    public WebSocketNotificationService(RedisWebSocketRelay redisWebSocketRelay,
                                        @Lazy NotificationService notificationService) {
        this.redisWebSocketRelay = redisWebSocketRelay;
        this.notificationService = notificationService;
    }

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
            notificationService.createNotification(
                    UUID.fromString(userId),
                    mapType(message.getType()),
                    message.getTitle(),
                    message.getMessage(),
                    null,
                    null,
                    message.getActionUrl(),
                    mapPriority(message.getPriority())
            );
        } catch (Exception e) {
            log.warn("Failed to persist in-app notification for user {}: {}", userId, e.getMessage());
        }
    }

    private Notification.NotificationType mapType(NotificationMessage.NotificationType type) {
        if (type == null) {
            return Notification.NotificationType.GENERAL;
        }
        try {
            return Notification.NotificationType.valueOf(type.name());
        } catch (IllegalArgumentException ex) {
            return Notification.NotificationType.GENERAL;
        }
    }

    private Notification.Priority mapPriority(NotificationMessage.Priority priority) {
        if (priority == null) {
            return Notification.Priority.NORMAL;
        }
        try {
            return Notification.Priority.valueOf(priority.name());
        } catch (IllegalArgumentException ex) {
            return Notification.Priority.NORMAL;
        }
    }
}
