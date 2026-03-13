package com.hrms.api.mobile.controller;

import com.hrms.api.mobile.dto.MobileNotificationDto;
import com.hrms.application.mobile.service.MobileNotificationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mobile/notifications")
@RequiredArgsConstructor
@Tag(name = "Mobile Notifications", description = "Mobile-optimized notification management endpoints")
public class MobileNotificationController {

    private final MobileNotificationService mobileNotificationService;

    @PostMapping("/register-device")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Register device for push notifications", description = "Register FCM or APNs token for receiving push notifications")
    public ResponseEntity<Void> registerDevice(
            @Valid @RequestBody MobileNotificationDto.DeviceRegistrationRequest request) {
        mobileNotificationService.registerDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/unread")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Get unread notifications", description = "Get unread notification count and last 10 notifications")
    public ResponseEntity<MobileNotificationDto.UnreadNotificationsResponse> getUnreadNotifications() {
        return ResponseEntity.ok(mobileNotificationService.getUnreadNotifications());
    }

    @PostMapping("/mark-read")
    @RequiresPermission(Permission.NOTIFICATION_VIEW)
    @Operation(summary = "Mark notifications as read", description = "Mark single, multiple, or all notifications as read")
    public ResponseEntity<MobileNotificationDto.MarkReadResponse> markNotificationsAsRead(
            @Valid @RequestBody MobileNotificationDto.MarkReadRequest request) {
        return ResponseEntity.ok(mobileNotificationService.markNotificationsAsRead(request));
    }
}
