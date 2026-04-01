package com.hrms.api.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MobileCheckInResponse {

    private UUID attendanceRecordId;
    private UUID employeeId;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;

    // Geofence validation
    private Boolean withinGeofence;
    private String nearestOfficeName;
    private Integer distanceFromOffice;
    private Boolean isRemoteCheckIn;

    // Status
    private String status;
    private String message;

    // Location details
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String resolvedAddress;

    // Work details (for check-out)
    private Integer workDurationMinutes;
    private Boolean isLate;
    private Integer lateByMinutes;
    private Boolean isEarlyDeparture;
    private Integer earlyDepartureMinutes;

    // Validation flags
    private Boolean deviceVerified;
    private Boolean mockLocationDetected;
    private Boolean photoVerified;

    // Quick actions
    private Boolean canRequestRegularization;
}
