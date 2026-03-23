package com.hrms.domain.notification;

import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ws-notifications")
@RequiredArgsConstructor
public class WebSocketNotificationController {

    private final WebSocketNotificationService notificationService;

    // SEC-011 FIX: Added RBAC — broadcasting notifications is an admin-level action
    @PostMapping("/broadcast")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    public ResponseEntity<Void> broadcastNotification(@Valid @RequestBody NotificationMessage message) {
        message.setTimestamp(System.currentTimeMillis());
        notificationService.broadcast(message);
        return ResponseEntity.ok().build();
    }
}
