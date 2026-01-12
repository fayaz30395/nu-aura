package com.hrms.domain.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service("domainWebSocketNotificationService")
@RequiredArgsConstructor
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendToUser(String userId, NotificationMessage message) {
        // In a real app with Spring Security, you would target specific users
        // For this demo, we'll broadcast to a user-specific topic that the frontend
        // subscribes to
        messagingTemplate.convertAndSend("/topic/user/" + userId, message);
    }

    public void broadcast(NotificationMessage message) {
        messagingTemplate.convertAndSend("/topic/broadcast", message);
    }
}
