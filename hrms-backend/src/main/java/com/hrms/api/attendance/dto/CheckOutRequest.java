package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CheckOutRequest {
    @NotNull
    private UUID employeeId;

    private LocalDateTime checkOutTime;
    private String source = "WEB";
    private String location;
    private String ip;

    // GPS coordinates for geofencing
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Boolean skipGeofenceValidation = false;
}
