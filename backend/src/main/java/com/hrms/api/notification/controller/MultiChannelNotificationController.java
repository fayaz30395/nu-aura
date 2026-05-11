package com.hrms.api.notification.controller;

import com.hrms.api.notification.dto.*;
import com.hrms.application.notification.service.MultiChannelNotificationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Template created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:MANAGE permission")
    })
    public ResponseEntity<NotificationTemplateDto> createTemplate(@Valid @RequestBody NotificationTemplateDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.createTemplate(request));
    }

    @PutMapping("/templates/{templateId}")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    @Operation(summary = "Update notification template", description = "Updates an existing notification template")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Template updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Template not found")
    })
    public ResponseEntity<NotificationTemplateDto> updateTemplate(
            @Parameter(description = "Template UUID") @PathVariable UUID templateId,
            @Valid @RequestBody NotificationTemplateDto request) {
        return ResponseEntity.ok(notificationService.updateTemplate(templateId, request));
    }

    @GetMapping("/templates")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Search templates", description = "Search notification templates with filters")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Templates retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<Page<NotificationTemplateDto>> searchTemplates(
            @Parameter(description = "Filter by category") @RequestParam(required = false) String category,
            @Parameter(description = "Search query string") @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(notificationService.searchTemplates(category, search, pageable));
    }

    @GetMapping("/templates/code/{code}")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get template by code", description = "Returns a template by its unique code")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Template found"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Template not found")
    })
    public ResponseEntity<NotificationTemplateDto> getTemplateByCode(
            @Parameter(description = "Unique template code") @PathVariable String code) {
        return ResponseEntity.ok(notificationService.getTemplateByCode(code));
    }

    @GetMapping("/templates/category/{category}")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get templates by category", description = "Returns all active templates for a category")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Templates retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<List<NotificationTemplateDto>> getTemplatesByCategory(
            @Parameter(description = "Template category") @PathVariable String category) {
        return ResponseEntity.ok(notificationService.getTemplatesByCategory(category));
    }

    // ==================== SEND NOTIFICATIONS ====================

    @PostMapping("/send")
    @RequiresPermission(Permission.NOTIFICATION_SEND)
    @Operation(summary = "Send notification", description = "Sends notifications to recipients through multiple channels")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Notifications dispatched successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:SEND permission")
    })
    public ResponseEntity<List<MultiChannelNotificationDto>> sendNotification(
            @Valid @RequestBody SendNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.sendNotification(request));
    }

    // ==================== USER NOTIFICATIONS ====================

    @GetMapping("/my")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get my notifications", description = "Returns current user's in-app notifications")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Notifications retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<Page<MultiChannelNotificationDto>> getMyNotifications(Pageable pageable) {
        return ResponseEntity.ok(notificationService.getUserNotifications(pageable));
    }

    @GetMapping("/my/unread-count")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get unread count", description = "Returns count of unread notifications for current user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Unread count retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<Long> getUnreadCount() {
        return ResponseEntity.ok(notificationService.getUnreadCount());
    }

    @PutMapping("/{notificationId}/read")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Mark as read", description = "Marks a notification as read")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Notification marked as read"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission"),
            @ApiResponse(responseCode = "404", description = "Notification not found")
    })
    public ResponseEntity<Void> markAsRead(
            @Parameter(description = "Notification UUID") @PathVariable UUID notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/my/read-all")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Mark all as read", description = "Marks all notifications as read for current user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "All notifications marked as read"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok().build();
    }

    // ==================== USER PREFERENCES ====================

    @GetMapping("/preferences")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get my preferences", description = "Returns current user's notification preferences")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Preferences retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<List<UserNotificationPreferenceDto>> getMyPreferences() {
        return ResponseEntity.ok(notificationService.getUserPreferences());
    }

    @PutMapping("/preferences")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Update preference", description = "Updates a notification preference for current user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Preference updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<UserNotificationPreferenceDto> updatePreference(
            @Valid @RequestBody UserNotificationPreferenceDto request) {
        return ResponseEntity.ok(notificationService.updatePreference(request));
    }

    // ==================== CHANNEL CONFIGURATION ====================

    @PostMapping("/channels/config")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    @Operation(summary = "Configure channel", description = "Configures a notification channel")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Channel configured successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:MANAGE permission")
    })
    public ResponseEntity<NotificationChannelConfigDto> configureChannel(
            @Valid @RequestBody NotificationChannelConfigDto request) {
        return ResponseEntity.ok(notificationService.configureChannel(request));
    }

    @GetMapping("/channels/config")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get channel configs", description = "Returns all channel configurations")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Channel configs retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<List<NotificationChannelConfigDto>> getChannelConfigs() {
        return ResponseEntity.ok(notificationService.getChannelConfigs());
    }

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get notification dashboard", description = "Returns notification analytics dashboard")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Dashboard retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires NOTIFICATION:VIEW permission")
    })
    public ResponseEntity<NotificationDashboard> getDashboard() {
        return ResponseEntity.ok(notificationService.getDashboard());
    }
}
