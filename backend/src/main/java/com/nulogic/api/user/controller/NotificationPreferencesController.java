package com.nulogic.api.user.controller;

import com.nulogic.api.user.dto.NotificationPreferencesResponse;
import com.nulogic.api.user.dto.UpdateNotificationPreferencesRequest;
import com.nulogic.application.user.service.NotificationPreferencesService;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static com.nulogic.common.security.Permission.SETTINGS_UPDATE;
import static com.nulogic.common.security.Permission.SETTINGS_VIEW;

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
