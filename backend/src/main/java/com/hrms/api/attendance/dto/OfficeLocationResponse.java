package com.hrms.api.attendance.dto;

import com.hrms.domain.attendance.OfficeLocation;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class OfficeLocationResponse {
    private UUID id;
    private String locationName;
    private String locationCode;
    private String address;
    private String city;
    private String state;
    private String country;
    private String zipCode;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer geofenceRadiusMeters;
    private Boolean isGeofenceEnabled;
    private Boolean allowRemoteCheckin;
    private Boolean isHeadquarters;
    private Boolean isActive;
    private String timezone;
    private String workingDays;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static OfficeLocationResponse fromEntity(OfficeLocation entity) {
        OfficeLocationResponse response = new OfficeLocationResponse();
        response.setId(entity.getId());
        response.setLocationName(entity.getLocationName());
        response.setLocationCode(entity.getLocationCode());
        response.setAddress(entity.getAddress());
        response.setCity(entity.getCity());
        response.setState(entity.getState());
        response.setCountry(entity.getCountry());
        response.setZipCode(entity.getZipCode());
        response.setLatitude(entity.getLatitude());
        response.setLongitude(entity.getLongitude());
        response.setGeofenceRadiusMeters(entity.getGeofenceRadiusMeters());
        response.setIsGeofenceEnabled(entity.getIsGeofenceEnabled());
        response.setAllowRemoteCheckin(entity.getAllowRemoteCheckin());
        response.setIsHeadquarters(entity.getIsHeadquarters());
        response.setIsActive(entity.getIsActive());
        response.setTimezone(entity.getTimezone());
        response.setWorkingDays(entity.getWorkingDays());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }
}
