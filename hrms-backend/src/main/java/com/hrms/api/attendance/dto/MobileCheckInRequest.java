package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MobileCheckInRequest {

    @NotNull(message = "Latitude is required")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    private BigDecimal longitude;

    private BigDecimal accuracy; // GPS accuracy in meters

    private String deviceId;

    private String deviceModel;

    private String osVersion;

    private String appVersion;

    private String networkType; // WIFI, MOBILE_DATA, etc.

    private String ssid; // WiFi SSID if connected

    private String bssid; // WiFi BSSID for additional validation

    private BigDecimal batteryLevel;

    private Boolean isMockLocation; // Flag for mock location detection

    private String photoBase64; // Selfie for face recognition (optional)

    private String notes;
}
