package com.hrms.api.attendance.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "Request payload for creating or updating an office location")
public class OfficeLocationRequest {

    @NotBlank(message = "Location name is required")
    @Size(min = 2, max = 100, message = "Location name must be between 2 and 100 characters")
    @Schema(description = "Name of the office location", example = "Bangalore HQ")
    private String locationName;

    @NotBlank(message = "Location code is required")
    @Size(min = 2, max = 20, message = "Location code must be between 2 and 20 characters")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Location code must contain only uppercase letters, numbers, underscores, and hyphens")
    @Schema(description = "Unique code for the location", example = "BLR-HQ")
    private String locationCode;

    @Size(max = 500, message = "Address cannot exceed 500 characters")
    @Schema(description = "Full street address", example = "123 Tech Park, Whitefield")
    private String address;

    @Size(max = 100, message = "City cannot exceed 100 characters")
    @Schema(description = "City name", example = "Bangalore")
    private String city;

    @Size(max = 100, message = "State cannot exceed 100 characters")
    @Schema(description = "State or province", example = "Karnataka")
    private String state;

    @Size(max = 100, message = "Country cannot exceed 100 characters")
    @Schema(description = "Country name", example = "India")
    private String country;

    @Size(max = 20, message = "Zip code cannot exceed 20 characters")
    @Schema(description = "Postal/ZIP code", example = "560066")
    private String zipCode;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    @Schema(description = "GPS latitude coordinate", example = "12.9716")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    @Schema(description = "GPS longitude coordinate", example = "77.5946")
    private BigDecimal longitude;

    @Min(value = 50, message = "Geofence radius must be at least 50 meters")
    @Max(value = 5000, message = "Geofence radius cannot exceed 5000 meters")
    @Schema(description = "Geofence radius in meters for attendance validation", example = "200")
    private Integer geofenceRadiusMeters = 100;

    @Schema(description = "Whether geofence validation is enabled for this location", example = "true")
    private Boolean isGeofenceEnabled = true;

    @Schema(description = "Whether remote check-in is allowed from this location", example = "false")
    private Boolean allowRemoteCheckin = false;

    @Schema(description = "Whether this is the company headquarters", example = "true")
    private Boolean isHeadquarters = false;

    @Size(max = 50, message = "Timezone cannot exceed 50 characters")
    @Schema(description = "IANA timezone identifier", example = "Asia/Kolkata")
    private String timezone = "Asia/Kolkata";

    @Pattern(regexp = "^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$",
            message = "Working days must be comma-separated day codes (MON,TUE,WED,THU,FRI,SAT,SUN)")
    @Schema(description = "Comma-separated list of working days", example = "MON,TUE,WED,THU,FRI")
    private String workingDays = "MON,TUE,WED,THU,FRI";
}
