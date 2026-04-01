package com.hrms.api.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GeofenceValidationResponse {
    private boolean isValid;
    private boolean isWithinGeofence;
    private UUID nearestLocationId;
    private String nearestLocationName;
    private int distanceMeters;
    private int allowedRadius;
    private String message;
}
