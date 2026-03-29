package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CheckOutRequest {
    // Nullable: when null, resolves to the authenticated user's employee ID
    private UUID employeeId;

    @NotNull(message = "Check-out time is required")
    private LocalDateTime checkOutTime;

    @Pattern(regexp = "^(WEB|MOBILE|BIOMETRIC|KIOSK)$", message = "Source must be WEB, MOBILE, BIOMETRIC, or KIOSK")
    private String source = "WEB";

    @Size(max = 500, message = "Location must not exceed 500 characters")
    private String location;

    @Size(max = 45, message = "IP address must not exceed 45 characters")
    private String ip;

    // Client's local date - used to ensure correct attendance date regardless of timezone
    private LocalDate attendanceDate;

    // GPS coordinates for geofencing
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Boolean skipGeofenceValidation = false;
}
