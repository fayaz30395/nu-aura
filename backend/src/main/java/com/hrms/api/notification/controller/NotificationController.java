package com.hrms.api.notification.controller;

import com.hrms.api.notification.dto.CreateNotificationRequest;
import com.hrms.api.notification.dto.NotificationResponse;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.notification.Notification;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.hrms.common.security.Permission.NOTIFICATIONS_CREATE;
import static com.hrms.common.security.Permission.NOTIFICATIONS_VIEW;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @RequiresPermission(NOTIFICATIONS_VIEW)
    public ResponseEntity<Page<NotificationResponse>> getMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        UUID currentUserId = SecurityContext.getCurrentUserId();
        Page<Notification> notifications = notificationService.getUserNotifications(currentUserId, page, size);
        Page<NotificationResponse> response = notifications.map(NotificationResponse::fromEntity);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread")
    @RequiresPermission(NOTIFICATIONS_VIEW)
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications() {
        UUID currentUserId = SecurityContext.getCurrentUserId();
        List<Notification> notifications = notificationService.getUnreadNotifications(currentUserId);
        List<NotificationResponse> response = notifications.stream()
                .map(NotificationResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread/count")
    @RequiresPermission(NOTIFICATIONS_VIEW)
    public ResponseEntity<Long> getUnreadCount() {
        UUID currentUserId = SecurityContext.getCurrentUserId();
        Long count = notificationService.getUnreadCount(currentUserId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/recent")
    @RequiresPermission(NOTIFICATIONS_VIEW)
    public ResponseEntity<List<NotificationResponse>> getRecentNotifications(
            @RequestParam(defaultValue = "24") int hours
    ) {
        UUID currentUserId = SecurityContext.getCurrentUserId();
        List<Notification> notifications = notificationService.getRecentNotifications(currentUserId, hours);
        List<NotificationResponse> response = notifications.stream()
                .map(NotificationResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(NOTIFICATIONS_VIEW)
    public ResponseEntity<NotificationResponse> getNotificationById(@PathVariable UUID id) {
        Notification notification = notificationService.getNotificationById(id);
        return ResponseEntity.ok(NotificationResponse.fromEntity(notification));
    }

    @PostMapping
    @RequiresPermission(NOTIFICATIONS_CREATE)
    public ResponseEntity<NotificationResponse> createNotification(
            @Valid @RequestBody CreateNotificationRequest request
    ) {
        Notification notification = notificationService.createNotification(
                request.getUserId(),
                Notification.NotificationType.valueOf(request.getType()),
                request.getTitle(),
                request.getMessage(),
                request.getRelatedEntityId(),
                request.getRelatedEntityType(),
                request.getActionUrl(),
                request.getPriority() != null ? Notification.Priority.valueOf(request.getPriority()) : null
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(NotificationResponse.fromEntity(notification));
    }

    @PutMapping("/read-all")
    @RequiresPermission(NOTIFICATIONS_VIEW)
    public ResponseEntity<Void> markAllAsRead() {
        UUID currentUserId = SecurityContext.getCurrentUserId();
        notificationService.markAllAsRead(currentUserId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(NOTIFICATIONS_VIEW)
    public ResponseEntity<Void> deleteNotification(@PathVariable UUID id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }
}
