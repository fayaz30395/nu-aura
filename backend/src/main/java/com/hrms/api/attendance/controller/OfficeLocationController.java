package com.hrms.api.attendance.controller;

import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.OfficeLocationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.attendance.OfficeLocation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * REST controller for managing office locations and geofence configurations.
 * Used for GPS-based attendance validation.
 */
@RestController
@RequestMapping("/api/v1/office-locations")
@RequiredArgsConstructor
@Tag(name = "Office Locations", description = "Manage office locations and geofence settings for attendance validation")
public class OfficeLocationController {

    private final OfficeLocationService officeLocationService;

    @Operation(summary = "Create a new office location",
            description = "Creates a new office location with optional geofence configuration for GPS-based attendance.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Location created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data or duplicate location code"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions")
    })
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

    @Operation(summary = "Update an office location",
            description = "Updates an existing office location's details and geofence configuration.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Location updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "404", description = "Location not found")
    })
    @PutMapping("/{id}")
    @RequiresPermission(Permission.OFFICE_LOCATION_UPDATE)
    public ResponseEntity<OfficeLocationResponse> updateLocation(
            @Parameter(description = "Location UUID") @PathVariable UUID id,
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

    @Operation(summary = "Get all office locations",
            description = "Retrieves paginated list of all office locations.")
    @GetMapping
    @RequiresPermission(Permission.OFFICE_LOCATION_VIEW)
    public ResponseEntity<Page<OfficeLocationResponse>> getAllLocations(Pageable pageable) {
        Page<OfficeLocation> locations = officeLocationService.getAllLocations(pageable);
        Page<OfficeLocationResponse> response = locations.map(OfficeLocationResponse::fromEntity);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get active office locations",
            description = "Retrieves all active office locations. Used for dropdown selections.")
    @GetMapping("/active")
    @RequiresPermission(Permission.OFFICE_LOCATION_VIEW)
    public ResponseEntity<List<OfficeLocationResponse>> getActiveLocations() {
        List<OfficeLocation> locations = officeLocationService.getActiveLocations();
        List<OfficeLocationResponse> response = locations.stream()
                .map(OfficeLocationResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get office location by ID",
            description = "Retrieves a specific office location by its UUID.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Location found"),
            @ApiResponse(responseCode = "404", description = "Location not found")
    })
    @GetMapping("/{id}")
    @RequiresPermission(Permission.OFFICE_LOCATION_VIEW)
    public ResponseEntity<OfficeLocationResponse> getLocationById(
            @Parameter(description = "Location UUID") @PathVariable UUID id) {
        return officeLocationService.getLocationById(id)
                .map(location -> ResponseEntity.ok(OfficeLocationResponse.fromEntity(location)))
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Delete an office location",
            description = "Deletes an office location. May fail if employees are assigned to this location.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Location deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Cannot delete - employees assigned to location"),
            @ApiResponse(responseCode = "404", description = "Location not found")
    })
    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.OFFICE_LOCATION_DELETE)
    public ResponseEntity<Void> deleteLocation(
            @Parameter(description = "Location UUID") @PathVariable UUID id) {
        officeLocationService.deleteLocation(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Validate GPS coordinates against geofences",
            description = "Checks if the provided GPS coordinates are within any configured office geofence. " +
                    "Used during mobile attendance check-in/check-out.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Validation result returned"),
            @ApiResponse(responseCode = "400", description = "Invalid GPS coordinates")
    })
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
