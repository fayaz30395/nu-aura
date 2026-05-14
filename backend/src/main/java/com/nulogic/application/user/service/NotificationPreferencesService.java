package com.nulogic.application.user.service;

import com.nulogic.api.user.dto.NotificationPreferencesResponse;
import com.nulogic.api.user.dto.UpdateNotificationPreferencesRequest;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.user.model.UserNotificationPreferences;
import com.nulogic.infrastructure.user.repository.UserNotificationPreferencesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationPreferencesService {

    private final UserNotificationPreferencesRepository preferencesRepository;
    private final TenantTimeService tenantTimeService;

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getPreferences(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        UserNotificationPreferences preferences = preferencesRepository
                .findByUserIdAndTenantId(userId, tenantId)
                .orElseGet(() -> createDefaultPreferences(userId, tenantId));

        return mapToResponse(preferences);
    }

    @Transactional
    public NotificationPreferencesResponse updatePreferences(UUID userId, UpdateNotificationPreferencesRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        UserNotificationPreferences preferences = preferencesRepository
                .findByUserIdAndTenantId(userId, tenantId)
                .orElseGet(() -> createDefaultPreferences(userId, tenantId));

        // Update preferences
        preferences.setEmailNotifications(request.getEmailNotifications());
        preferences.setPushNotifications(request.getPushNotifications());
        preferences.setSmsNotifications(request.getSmsNotifications());
        preferences.setSecurityAlerts(request.getSecurityAlerts());
        preferences.setUpdatedAt(tenantTimeService.now(tenantId));

        UserNotificationPreferences savedPreferences = preferencesRepository.save(preferences);
        return mapToResponse(savedPreferences);
    }

    private UserNotificationPreferences createDefaultPreferences(UUID userId, UUID tenantId) {
        // Do not set ID manually — @GeneratedValue(strategy = UUID) handles it.
        // Setting the ID before save() makes Hibernate treat the entity as detached
        // (since @Version is null), which causes "uninitialized version value" errors.
        UserNotificationPreferences preferences = new UserNotificationPreferences();
        preferences.setUserId(userId);
        preferences.setTenantId(tenantId);
        preferences.setEmailNotifications(true);
        preferences.setPushNotifications(true);
        preferences.setSmsNotifications(false);
        preferences.setSecurityAlerts(true);
        LocalDateTime nowTenant = tenantTimeService.now(tenantId);
        preferences.setCreatedAt(nowTenant);
        preferences.setUpdatedAt(nowTenant);
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
