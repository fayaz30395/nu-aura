package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OfficeLocationRequest {

    @NotBlank(message = "Location name is required")
    private String locationName;

    @NotBlank(message = "Location code is required")
    private String locationCode;

    private String address;
    private String city;
    private String state;
    private String country;
    private String zipCode;

    @NotNull(message = "Latitude is required")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    private BigDecimal longitude;

    private Integer geofenceRadiusMeters = 100;
    private Boolean isGeofenceEnabled = true;
    private Boolean allowRemoteCheckin = false;
    private Boolean isHeadquarters = false;
    private String timezone = "Asia/Kolkata";
    private String workingDays = "MON,TUE,WED,THU,FRI";
}
