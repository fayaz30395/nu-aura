package com.hrms.api.notification.controller;

import com.hrms.api.notification.dto.*;
import com.hrms.application.notification.service.MultiChannelNotificationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Multi-Channel Notifications", description = "Multi-channel notification management APIs")
public class MultiChannelNotificationController {

    private final MultiChannelNotificationService notificationService;

    // ==================== TEMPLATE MANAGEMENT ====================

    @PostMapping("/templates")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    @Operation(summary = "Create notification template", description = "Creates a new notification template")
    public ResponseEntity<NotificationTemplateDto> createTemplate(@Valid @RequestBody NotificationTemplateDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.createTemplate(request));
    }

    @PutMapping("/templates/{templateId}")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    @Operation(summary = "Update notification template", description = "Updates an existing notification template")
    public ResponseEntity<NotificationTemplateDto> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody NotificationTemplateDto request) {
        return ResponseEntity.ok(notificationService.updateTemplate(templateId, request));
    }

    @GetMapping("/templates")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Search templates", description = "Search notification templates with filters")
    public ResponseEntity<Page<NotificationTemplateDto>> searchTemplates(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(notificationService.searchTemplates(category, search, pageable));
    }

    @GetMapping("/templates/code/{code}")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get template by code", description = "Returns a template by its unique code")
    public ResponseEntity<NotificationTemplateDto> getTemplateByCode(@PathVariable String code) {
        return ResponseEntity.ok(notificationService.getTemplateByCode(code));
    }

    @GetMapping("/templates/category/{category}")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get templates by category", description = "Returns all active templates for a category")
    public ResponseEntity<List<NotificationTemplateDto>> getTemplatesByCategory(@PathVariable String category) {
        return ResponseEntity.ok(notificationService.getTemplatesByCategory(category));
    }

    // ==================== SEND NOTIFICATIONS ====================

    @PostMapping("/send")
    @RequiresPermission(Permission.NOTIFICATION_SEND)
    @Operation(summary = "Send notification", description = "Sends notifications to recipients through multiple channels")
    public ResponseEntity<List<MultiChannelNotificationDto>> sendNotification(
            @Valid @RequestBody SendNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.sendNotification(request));
    }

    // ==================== USER NOTIFICATIONS ====================

    @GetMapping("/my")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get my notifications", description = "Returns current user's in-app notifications")
    public ResponseEntity<Page<MultiChannelNotificationDto>> getMyNotifications(Pageable pageable) {
        return ResponseEntity.ok(notificationService.getUserNotifications(pageable));
    }

    @GetMapping("/my/unread-count")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get unread count", description = "Returns count of unread notifications for current user")
    public ResponseEntity<Long> getUnreadCount() {
        return ResponseEntity.ok(notificationService.getUnreadCount());
    }

    @PutMapping("/{notificationId}/read")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Mark as read", description = "Marks a notification as read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/my/read-all")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Mark all as read", description = "Marks all notifications as read for current user")
    public ResponseEntity<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok().build();
    }

    // ==================== USER PREFERENCES ====================

    @GetMapping("/preferences")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get my preferences", description = "Returns current user's notification preferences")
    public ResponseEntity<List<UserNotificationPreferenceDto>> getMyPreferences() {
        return ResponseEntity.ok(notificationService.getUserPreferences());
    }

    @PutMapping("/preferences")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Update preference", description = "Updates a notification preference for current user")
    public ResponseEntity<UserNotificationPreferenceDto> updatePreference(
            @Valid @RequestBody UserNotificationPreferenceDto request) {
        return ResponseEntity.ok(notificationService.updatePreference(request));
    }

    // ==================== CHANNEL CONFIGURATION ====================

    @PostMapping("/channels/config")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    @Operation(summary = "Configure channel", description = "Configures a notification channel")
    public ResponseEntity<NotificationChannelConfigDto> configureChannel(
            @Valid @RequestBody NotificationChannelConfigDto request) {
        return ResponseEntity.ok(notificationService.configureChannel(request));
    }

    @GetMapping("/channels/config")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get channel configs", description = "Returns all channel configurations")
    public ResponseEntity<List<NotificationChannelConfigDto>> getChannelConfigs() {
        return ResponseEntity.ok(notificationService.getChannelConfigs());
    }

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get notification dashboard", description = "Returns notification analytics dashboard")
    public ResponseEntity<NotificationDashboard> getDashboard() {
        return ResponseEntity.ok(notificationService.getDashboard());
    }
}
