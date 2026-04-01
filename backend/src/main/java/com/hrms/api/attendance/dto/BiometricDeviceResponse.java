package com.hrms.api.attendance.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricDeviceResponse {

    private UUID id;
    private UUID tenantId;
    private String deviceName;
    private String deviceType;
    private String serialNumber;
    private UUID locationId;
    private String locationName;
    private String ipAddress;
    private String manufacturer;
    private String model;
    private String firmwareVersion;
    private Boolean isActive;
    private Boolean isOnline;
    private LocalDateTime lastSyncAt;
    private LocalDateTime lastHeartbeatAt;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Stats (populated when needed)
    private Long totalPunchesToday;
    private Long failedPunchesToday;
    private Long pendingPunches;
}
