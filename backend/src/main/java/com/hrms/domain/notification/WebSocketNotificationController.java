package com.hrms.domain.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ws-notifications")
@RequiredArgsConstructor
public class WebSocketNotificationController {

    private final WebSocketNotificationService notificationService;

    @PostMapping("/broadcast")
    public ResponseEntity<Void> broadcastNotification(@RequestBody NotificationMessage message) {
        message.setTimestamp(System.currentTimeMillis());
        notificationService.broadcast(message);
        return ResponseEntity.ok().build();
    }
}
