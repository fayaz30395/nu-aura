package com.hrms.api.user.controller;

import com.hrms.api.user.dto.NotificationPreferencesResponse;
import com.hrms.api.user.dto.UpdateNotificationPreferencesRequest;
import com.hrms.application.user.service.NotificationPreferencesService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static com.hrms.common.security.Permission.SETTINGS_UPDATE;
import static com.hrms.common.security.Permission.SETTINGS_VIEW;

@RestController
@RequestMapping("/api/v1/notification-preferences")
@RequiredArgsConstructor
public class NotificationPreferencesController {

    private final NotificationPreferencesService preferencesService;

    @GetMapping
    @RequiresPermission(SETTINGS_VIEW)
    public ResponseEntity<NotificationPreferencesResponse> getPreferences() {
        NotificationPreferencesResponse response = preferencesService.getPreferences(
                SecurityContext.getCurrentUserId()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping
    @RequiresPermission(SETTINGS_UPDATE)
    public ResponseEntity<NotificationPreferencesResponse> updatePreferences(
            @Valid @RequestBody UpdateNotificationPreferencesRequest request) {
        NotificationPreferencesResponse response = preferencesService.updatePreferences(
                SecurityContext.getCurrentUserId(),
                request
        );
        return ResponseEntity.ok(response);
    }
}
