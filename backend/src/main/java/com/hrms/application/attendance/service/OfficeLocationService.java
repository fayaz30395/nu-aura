package com.hrms.application.attendance.service;

import com.hrms.common.config.CacheConfig;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.OfficeLocation;
import com.hrms.infrastructure.attendance.repository.OfficeLocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OfficeLocationService {

    private final OfficeLocationRepository officeLocationRepository;

    @Transactional
    @CacheEvict(value = CacheConfig.OFFICE_LOCATIONS, allEntries = true)
    public OfficeLocation createLocation(OfficeLocation location) {
        UUID tenantId = TenantContext.getCurrentTenant();
        location.setTenantId(tenantId);
        location.setId(UUID.randomUUID());

        if (officeLocationRepository.existsByLocationCodeAndTenantId(location.getLocationCode(), tenantId)) {
            throw new IllegalArgumentException("Location code already exists: " + location.getLocationCode());
        }

        log.info("Creating office location: {} for tenant: {}", location.getLocationName(), tenantId);
        return officeLocationRepository.save(location);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.OFFICE_LOCATIONS, allEntries = true)
    public OfficeLocation updateLocation(UUID id, OfficeLocation updates) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OfficeLocation location = officeLocationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new RuntimeException("Office location not found: " + id));

        location.setLocationName(updates.getLocationName());
        location.setAddress(updates.getAddress());
        location.setCity(updates.getCity());
        location.setState(updates.getState());
        location.setCountry(updates.getCountry());
        location.setZipCode(updates.getZipCode());
        location.setLatitude(updates.getLatitude());
        location.setLongitude(updates.getLongitude());
        location.setGeofenceRadiusMeters(updates.getGeofenceRadiusMeters());
        location.setIsGeofenceEnabled(updates.getIsGeofenceEnabled());
        location.setAllowRemoteCheckin(updates.getAllowRemoteCheckin());
        location.setIsHeadquarters(updates.getIsHeadquarters());
        location.setTimezone(updates.getTimezone());
        location.setWorkingDays(updates.getWorkingDays());

        log.info("Updated office location: {}", id);
        return officeLocationRepository.save(location);
    }

    @Transactional(readOnly = true)
    public Page<OfficeLocation> getAllLocations(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return officeLocationRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.OFFICE_LOCATIONS, keyGenerator = "tenantAwareKeyGenerator")
    public List<OfficeLocation> getActiveLocations() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return officeLocationRepository.findAllByTenantIdAndIsActiveTrue(tenantId);
    }

    @Transactional(readOnly = true)
    public Optional<OfficeLocation> getLocationById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return officeLocationRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional
    @CacheEvict(value = CacheConfig.OFFICE_LOCATIONS, allEntries = true)
    public void deleteLocation(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        OfficeLocation location = officeLocationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new RuntimeException("Office location not found: " + id));

        location.setIsActive(false);
        officeLocationRepository.save(location);
        log.info("Deactivated office location: {}", id);
    }

    /**
     * Validate if given coordinates are within any geofenced office location
     * Returns the closest valid office location or null if none
     */
    @Transactional(readOnly = true)
    public GeofenceValidationResult validateGeofence(BigDecimal latitude, BigDecimal longitude) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<OfficeLocation> geofencedLocations = officeLocationRepository.findAllByTenantIdAndIsGeofenceEnabledTrue(tenantId);

        if (geofencedLocations.isEmpty()) {
            // No geofenced locations configured, allow check-in
            return new GeofenceValidationResult(true, null, 0, "No geofence configured");
        }

        OfficeLocation closestLocation = null;
        double minDistance = Double.MAX_VALUE;

        for (OfficeLocation location : geofencedLocations) {
            double distance = location.calculateDistance(latitude.doubleValue(), longitude.doubleValue());
            if (distance < minDistance) {
                minDistance = distance;
                closestLocation = location;
            }
        }

        if (closestLocation != null) {
            boolean withinGeofence = closestLocation.isWithinGeofence(latitude.doubleValue(), longitude.doubleValue());
            String message = withinGeofence
                    ? "Within geofence of " + closestLocation.getLocationName()
                    : "Outside geofence. Nearest office: " + closestLocation.getLocationName() + " (" + Math.round(minDistance) + "m away)";

            return new GeofenceValidationResult(
                    withinGeofence || closestLocation.getAllowRemoteCheckin(),
                    closestLocation,
                    (int) Math.round(minDistance),
                    message
            );
        }

        return new GeofenceValidationResult(false, null, 0, "Unable to validate location");
    }

    public record GeofenceValidationResult(
            boolean isValid,
            OfficeLocation nearestLocation,
            int distanceMeters,
            String message
    ) {}
}
