package com.hrms.api.attendance.controller;

import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.OfficeLocationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.OfficeLocation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/office-locations")
@RequiredArgsConstructor
public class OfficeLocationController {

    private final OfficeLocationService officeLocationService;

    @PostMapping
    @RequiresPermission(Permission.OFFICE_LOCATION_CREATE)
    public ResponseEntity<OfficeLocationResponse> createLocation(
            @Valid @RequestBody OfficeLocationRequest request) {
        OfficeLocation location = OfficeLocation.builder()
                .locationName(request.getLocationName())
                .locationCode(request.getLocationCode())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .zipCode(request.getZipCode())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .geofenceRadiusMeters(request.getGeofenceRadiusMeters())
                .isGeofenceEnabled(request.getIsGeofenceEnabled())
                .allowRemoteCheckin(request.getAllowRemoteCheckin())
                .isHeadquarters(request.getIsHeadquarters())
                .timezone(request.getTimezone())
                .workingDays(request.getWorkingDays())
                .build();

        OfficeLocation created = officeLocationService.createLocation(location);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(OfficeLocationResponse.fromEntity(created));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.OFFICE_LOCATION_UPDATE)
    public ResponseEntity<OfficeLocationResponse> updateLocation(
            @PathVariable UUID id,
            @Valid @RequestBody OfficeLocationRequest request) {
        OfficeLocation updates = OfficeLocation.builder()
                .locationName(request.getLocationName())
                .locationCode(request.getLocationCode())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .zipCode(request.getZipCode())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .geofenceRadiusMeters(request.getGeofenceRadiusMeters())
                .isGeofenceEnabled(request.getIsGeofenceEnabled())
                .allowRemoteCheckin(request.getAllowRemoteCheckin())
                .isHeadquarters(request.getIsHeadquarters())
                .timezone(request.getTimezone())
                .workingDays(request.getWorkingDays())
                .build();

        OfficeLocation updated = officeLocationService.updateLocation(id, updates);
        return ResponseEntity.ok(OfficeLocationResponse.fromEntity(updated));
    }

    @GetMapping
    @RequiresPermission(Permission.OFFICE_LOCATION_VIEW)
    public ResponseEntity<Page<OfficeLocationResponse>> getAllLocations(Pageable pageable) {
        Page<OfficeLocation> locations = officeLocationService.getAllLocations(pageable);
        Page<OfficeLocationResponse> response = locations.map(OfficeLocationResponse::fromEntity);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.OFFICE_LOCATION_VIEW)
    public ResponseEntity<List<OfficeLocationResponse>> getActiveLocations() {
        List<OfficeLocation> locations = officeLocationService.getActiveLocations();
        List<OfficeLocationResponse> response = locations.stream()
                .map(OfficeLocationResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.OFFICE_LOCATION_VIEW)
    public ResponseEntity<OfficeLocationResponse> getLocationById(@PathVariable UUID id) {
        return officeLocationService.getLocationById(id)
                .map(location -> ResponseEntity.ok(OfficeLocationResponse.fromEntity(location)))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.OFFICE_LOCATION_DELETE)
    public ResponseEntity<Void> deleteLocation(@PathVariable UUID id) {
        officeLocationService.deleteLocation(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/validate-geofence")
    @RequiresPermission(Permission.ATTENDANCE_MARK)
    public ResponseEntity<GeofenceValidationResponse> validateGeofence(
            @Valid @RequestBody GeofenceValidationRequest request) {
        OfficeLocationService.GeofenceValidationResult result =
                officeLocationService.validateGeofence(request.getLatitude(), request.getLongitude());

        GeofenceValidationResponse response = new GeofenceValidationResponse();
        response.setValid(result.isValid());
        response.setWithinGeofence(result.isValid() && result.nearestLocation() != null);
        response.setDistanceMeters(result.distanceMeters());
        response.setMessage(result.message());

        if (result.nearestLocation() != null) {
            response.setNearestLocationId(result.nearestLocation().getId());
            response.setNearestLocationName(result.nearestLocation().getLocationName());
            response.setAllowedRadius(result.nearestLocation().getGeofenceRadiusMeters());
        }

        return ResponseEntity.ok(response);
    }
}
