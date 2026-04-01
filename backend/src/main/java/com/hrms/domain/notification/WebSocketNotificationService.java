package com.hrms.domain.notification;

import com.hrms.infrastructure.websocket.RedisWebSocketRelay;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service("domainWebSocketNotificationService")
@RequiredArgsConstructor
public class WebSocketNotificationService {

    private final RedisWebSocketRelay redisWebSocketRelay;

    /**
     * Send a notification to a specific user via user-destination (private queue).
     * Uses convertAndSendToUser so the message is delivered only to the target user's
     * WebSocket sessions, not a public topic.
     */
    @Transactional
    public void sendToUser(String userId, NotificationMessage message) {
        redisWebSocketRelay.convertAndSendToUser(userId, "/queue/notifications", message);
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
}
