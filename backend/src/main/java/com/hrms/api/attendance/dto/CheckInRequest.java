package com.hrms.api.attendance.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CheckInRequest {
    // Nullable: when null, resolves to the authenticated user's employee ID
    private UUID employeeId;

    private LocalDateTime checkInTime;
    private String source = "WEB";
    private String location;
    private String ip;

    // Client's local date - used to ensure correct attendance date regardless of timezone
    private LocalDate attendanceDate;

    // GPS coordinates for geofencing
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Boolean skipGeofenceValidation = false;
}
