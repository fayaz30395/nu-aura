package com.hrms.domain.notification;

import com.hrms.infrastructure.websocket.RedisWebSocketRelay;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("domainWebSocketNotificationService")
@RequiredArgsConstructor
public class WebSocketNotificationService {

    private final RedisWebSocketRelay redisWebSocketRelay;

    @Transactional
    public void sendToUser(String userId, NotificationMessage message) {
        // Publish through Redis so all pods deliver to their local WebSocket sessions
        redisWebSocketRelay.convertAndSend("/topic/user/" + userId, message);
    }

    public void broadcast(NotificationMessage message) {
        redisWebSocketRelay.convertAndSend("/topic/broadcast", message);
    }
}
