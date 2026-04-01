package com.hrms.api.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferencesResponse {
    private UUID id;
    private UUID userId;
    private UUID tenantId;
    private Boolean emailNotifications;
    private Boolean pushNotifications;
    private Boolean smsNotifications;
    private Boolean securityAlerts;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
