package com.hrms.api.user.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateNotificationPreferencesRequest {

    @NotNull(message = "Email notifications preference is required")
    private Boolean emailNotifications;

    @NotNull(message = "Push notifications preference is required")
    private Boolean pushNotifications;

    @NotNull(message = "SMS notifications preference is required")
    private Boolean smsNotifications;

    @NotNull(message = "Security alerts preference is required")
    private Boolean securityAlerts;
}
