package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "office_locations", indexes = {
    @Index(name = "idx_office_location_tenant", columnList = "tenantId"),
    @Index(name = "idx_office_location_active", columnList = "isActive")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfficeLocation extends TenantAware {

    @Column(name = "location_name", nullable = false, length = 100)
    private String locationName;

    @Column(name = "location_code", nullable = false, length = 50)
    private String locationCode;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "zip_code", length = 20)
    private String zipCode;

    @Column(name = "latitude", precision = 10, scale = 8, nullable = false)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8, nullable = false)
    private BigDecimal longitude;

    @Column(name = "geofence_radius_meters", nullable = false)
    @Builder.Default
    private Integer geofenceRadiusMeters = 100; // Default 100 meters

    @Column(name = "is_geofence_enabled")
    @Builder.Default
    private Boolean isGeofenceEnabled = true;

    @Column(name = "allow_remote_checkin")
    @Builder.Default
    private Boolean allowRemoteCheckin = false;

    @Column(name = "is_headquarters")
    @Builder.Default
    private Boolean isHeadquarters = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "timezone", length = 50)
    @Builder.Default
    private String timezone = "Asia/Kolkata";

    @Column(name = "working_days", length = 50)
    @Builder.Default
    private String workingDays = "MON,TUE,WED,THU,FRI"; // Comma-separated

    /**
     * Calculate distance from a given coordinate using Haversine formula
     * @param lat Latitude of the point
     * @param lng Longitude of the point
     * @return Distance in meters
     */
    public double calculateDistance(double lat, double lng) {
        final int R = 6371000; // Earth's radius in meters
        double latRad1 = Math.toRadians(this.latitude.doubleValue());
        double latRad2 = Math.toRadians(lat);
        double deltaLat = Math.toRadians(lat - this.latitude.doubleValue());
        double deltaLng = Math.toRadians(lng - this.longitude.doubleValue());

        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                   Math.cos(latRad1) * Math.cos(latRad2) *
                   Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Check if a coordinate is within the geofence
     */
    public boolean isWithinGeofence(double lat, double lng) {
        if (!isGeofenceEnabled) {
            return true; // If geofence is disabled, always return true
        }
        return calculateDistance(lat, lng) <= geofenceRadiusMeters;
    }
}
