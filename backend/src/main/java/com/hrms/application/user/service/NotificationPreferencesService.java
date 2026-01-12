package com.hrms.application.user.service;

import com.hrms.api.user.dto.NotificationPreferencesResponse;
import com.hrms.api.user.dto.UpdateNotificationPreferencesRequest;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.user.model.UserNotificationPreferences;
import com.hrms.domain.user.repository.UserNotificationPreferencesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationPreferencesService {

    private final UserNotificationPreferencesRepository preferencesRepository;

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getPreferences(UUID userId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        UserNotificationPreferences preferences = preferencesRepository
                .findByUserIdAndTenantId(userId, tenantId)
                .orElseGet(() -> createDefaultPreferences(userId, tenantId));

        return mapToResponse(preferences);
    }

    @Transactional
    public NotificationPreferencesResponse updatePreferences(UUID userId, UpdateNotificationPreferencesRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        UserNotificationPreferences preferences = preferencesRepository
                .findByUserIdAndTenantId(userId, tenantId)
                .orElseGet(() -> createDefaultPreferences(userId, tenantId));

        // Update preferences
        preferences.setEmailNotifications(request.getEmailNotifications());
        preferences.setPushNotifications(request.getPushNotifications());
        preferences.setSmsNotifications(request.getSmsNotifications());
        preferences.setSecurityAlerts(request.getSecurityAlerts());
        preferences.setUpdatedAt(LocalDateTime.now());

        UserNotificationPreferences savedPreferences = preferencesRepository.save(preferences);
        return mapToResponse(savedPreferences);
    }

    private UserNotificationPreferences createDefaultPreferences(UUID userId, UUID tenantId) {
        UserNotificationPreferences preferences = new UserNotificationPreferences();
        preferences.setId(UUID.randomUUID());
        preferences.setUserId(userId);
        preferences.setTenantId(tenantId);
        preferences.setEmailNotifications(true);
        preferences.setPushNotifications(true);
        preferences.setSmsNotifications(false);
        preferences.setSecurityAlerts(true);
        preferences.setCreatedAt(LocalDateTime.now());
        preferences.setUpdatedAt(LocalDateTime.now());
        return preferencesRepository.save(preferences);
    }

    private NotificationPreferencesResponse mapToResponse(UserNotificationPreferences preferences) {
        NotificationPreferencesResponse response = new NotificationPreferencesResponse();
        response.setId(preferences.getId());
        response.setUserId(preferences.getUserId());
        response.setTenantId(preferences.getTenantId());
        response.setEmailNotifications(preferences.getEmailNotifications());
        response.setPushNotifications(preferences.getPushNotifications());
        response.setSmsNotifications(preferences.getSmsNotifications());
        response.setSecurityAlerts(preferences.getSecurityAlerts());
        response.setCreatedAt(preferences.getCreatedAt());
        response.setUpdatedAt(preferences.getUpdatedAt());
        return response;
    }
}
