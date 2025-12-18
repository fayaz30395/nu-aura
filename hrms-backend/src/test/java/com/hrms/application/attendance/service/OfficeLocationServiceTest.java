package com.hrms.application.attendance.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.OfficeLocation;
import com.hrms.infrastructure.attendance.repository.OfficeLocationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfficeLocationServiceTest {

    @Mock
    private OfficeLocationRepository officeLocationRepository;

    @InjectMocks
    private OfficeLocationService officeLocationService;

    private MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;
    private UUID locationId;
    private OfficeLocation testLocation;

    // Test coordinates (Bangalore, India)
    private static final BigDecimal OFFICE_LAT = new BigDecimal("12.9716");
    private static final BigDecimal OFFICE_LNG = new BigDecimal("77.5946");

    // Location within geofence (50m away)
    private static final BigDecimal NEAR_LAT = new BigDecimal("12.9720");
    private static final BigDecimal NEAR_LNG = new BigDecimal("77.5946");

    // Location outside geofence (500m away)
    private static final BigDecimal FAR_LAT = new BigDecimal("12.9760");
    private static final BigDecimal FAR_LNG = new BigDecimal("77.5946");

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        locationId = UUID.randomUUID();

        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        testLocation = createTestLocation();
    }

    @AfterEach
    void tearDown() {
        if (tenantContextMock != null) {
            tenantContextMock.close();
        }
    }

    private OfficeLocation createTestLocation() {
        OfficeLocation location = OfficeLocation.builder()
                .locationName("Bangalore HQ")
                .locationCode("BLR-001")
                .address("123 Tech Park, Electronic City")
                .city("Bangalore")
                .state("Karnataka")
                .country("India")
                .zipCode("560100")
                .latitude(OFFICE_LAT)
                .longitude(OFFICE_LNG)
                .geofenceRadiusMeters(100)
                .isGeofenceEnabled(true)
                .allowRemoteCheckin(false)
                .isHeadquarters(true)
                .isActive(true)
                .timezone("Asia/Kolkata")
                .workingDays("MON,TUE,WED,THU,FRI")
                .build();
        location.setId(locationId);
        location.setTenantId(tenantId);
        return location;
    }

    // ================== Create Location Tests ==================

    @Test
    void createLocation_Success() {
        OfficeLocation newLocation = OfficeLocation.builder()
                .locationName("Mumbai Office")
                .locationCode("MUM-001")
                .latitude(new BigDecimal("19.0760"))
                .longitude(new BigDecimal("72.8777"))
                .build();

        when(officeLocationRepository.existsByLocationCodeAndTenantId("MUM-001", tenantId))
                .thenReturn(false);
        when(officeLocationRepository.save(any(OfficeLocation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        OfficeLocation result = officeLocationService.createLocation(newLocation);

        assertNotNull(result.getId());
        assertEquals(tenantId, result.getTenantId());
        assertEquals("Mumbai Office", result.getLocationName());
        verify(officeLocationRepository).save(any(OfficeLocation.class));
    }

    @Test
    void createLocation_DuplicateCode_ThrowsException() {
        OfficeLocation newLocation = OfficeLocation.builder()
                .locationName("Duplicate Office")
                .locationCode("BLR-001")
                .latitude(OFFICE_LAT)
                .longitude(OFFICE_LNG)
                .build();

        when(officeLocationRepository.existsByLocationCodeAndTenantId("BLR-001", tenantId))
                .thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                officeLocationService.createLocation(newLocation));

        assertTrue(exception.getMessage().contains("Location code already exists"));
        verify(officeLocationRepository, never()).save(any(OfficeLocation.class));
    }

    // ================== Update Location Tests ==================

    @Test
    void updateLocation_Success() {
        OfficeLocation updates = OfficeLocation.builder()
                .locationName("Updated Bangalore HQ")
                .address("New Address")
                .city("Bangalore")
                .state("Karnataka")
                .country("India")
                .zipCode("560101")
                .latitude(OFFICE_LAT)
                .longitude(OFFICE_LNG)
                .geofenceRadiusMeters(150)
                .isGeofenceEnabled(true)
                .allowRemoteCheckin(true)
                .isHeadquarters(true)
                .timezone("Asia/Kolkata")
                .workingDays("MON,TUE,WED,THU,FRI,SAT")
                .build();

        when(officeLocationRepository.findByIdAndTenantId(locationId, tenantId))
                .thenReturn(Optional.of(testLocation));
        when(officeLocationRepository.save(any(OfficeLocation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        OfficeLocation result = officeLocationService.updateLocation(locationId, updates);

        assertEquals("Updated Bangalore HQ", result.getLocationName());
        assertEquals("New Address", result.getAddress());
        assertEquals(150, result.getGeofenceRadiusMeters());
        assertTrue(result.getAllowRemoteCheckin());
        verify(officeLocationRepository).save(testLocation);
    }

    @Test
    void updateLocation_NotFound_ThrowsException() {
        when(officeLocationRepository.findByIdAndTenantId(locationId, tenantId))
                .thenReturn(Optional.empty());

        OfficeLocation updates = OfficeLocation.builder().locationName("Test").build();

        assertThrows(RuntimeException.class, () ->
                officeLocationService.updateLocation(locationId, updates));
    }

    // ================== Get Locations Tests ==================

    @Test
    void getAllLocations_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<OfficeLocation> expectedPage = new PageImpl<>(List.of(testLocation), pageable, 1);

        when(officeLocationRepository.findAllByTenantId(tenantId, pageable))
                .thenReturn(expectedPage);

        Page<OfficeLocation> result = officeLocationService.getAllLocations(pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("Bangalore HQ", result.getContent().get(0).getLocationName());
    }

    @Test
    void getActiveLocations_Success() {
        when(officeLocationRepository.findAllByTenantIdAndIsActiveTrue(tenantId))
                .thenReturn(List.of(testLocation));

        List<OfficeLocation> result = officeLocationService.getActiveLocations();

        assertEquals(1, result.size());
        assertTrue(result.get(0).getIsActive());
    }

    @Test
    void getLocationById_Success() {
        when(officeLocationRepository.findByIdAndTenantId(locationId, tenantId))
                .thenReturn(Optional.of(testLocation));

        Optional<OfficeLocation> result = officeLocationService.getLocationById(locationId);

        assertTrue(result.isPresent());
        assertEquals(testLocation.getLocationName(), result.get().getLocationName());
    }

    @Test
    void getLocationById_NotFound() {
        when(officeLocationRepository.findByIdAndTenantId(locationId, tenantId))
                .thenReturn(Optional.empty());

        Optional<OfficeLocation> result = officeLocationService.getLocationById(locationId);

        assertTrue(result.isEmpty());
    }

    // ================== Delete Location Tests ==================

    @Test
    void deleteLocation_Success() {
        when(officeLocationRepository.findByIdAndTenantId(locationId, tenantId))
                .thenReturn(Optional.of(testLocation));
        when(officeLocationRepository.save(any(OfficeLocation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        officeLocationService.deleteLocation(locationId);

        assertFalse(testLocation.getIsActive());
        verify(officeLocationRepository).save(testLocation);
    }

    @Test
    void deleteLocation_NotFound_ThrowsException() {
        when(officeLocationRepository.findByIdAndTenantId(locationId, tenantId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                officeLocationService.deleteLocation(locationId));
    }

    // ================== Geofence Validation Tests ==================

    @Test
    void validateGeofence_WithinGeofence_ReturnsValid() {
        when(officeLocationRepository.findAllByTenantIdAndIsGeofenceEnabledTrue(tenantId))
                .thenReturn(List.of(testLocation));

        OfficeLocationService.GeofenceValidationResult result =
                officeLocationService.validateGeofence(NEAR_LAT, NEAR_LNG);

        assertTrue(result.isValid());
        assertNotNull(result.nearestLocation());
        assertEquals("Bangalore HQ", result.nearestLocation().getLocationName());
        assertTrue(result.message().contains("Within geofence"));
    }

    @Test
    void validateGeofence_OutsideGeofence_ReturnsInvalid() {
        when(officeLocationRepository.findAllByTenantIdAndIsGeofenceEnabledTrue(tenantId))
                .thenReturn(List.of(testLocation));

        OfficeLocationService.GeofenceValidationResult result =
                officeLocationService.validateGeofence(FAR_LAT, FAR_LNG);

        assertFalse(result.isValid());
        assertNotNull(result.nearestLocation());
        assertTrue(result.message().contains("Outside geofence"));
    }

    @Test
    void validateGeofence_OutsideButRemoteAllowed_ReturnsValid() {
        testLocation.setAllowRemoteCheckin(true);

        when(officeLocationRepository.findAllByTenantIdAndIsGeofenceEnabledTrue(tenantId))
                .thenReturn(List.of(testLocation));

        OfficeLocationService.GeofenceValidationResult result =
                officeLocationService.validateGeofence(FAR_LAT, FAR_LNG);

        assertTrue(result.isValid()); // Remote check-in is allowed
    }

    @Test
    void validateGeofence_NoGeofencedLocations_ReturnsValid() {
        when(officeLocationRepository.findAllByTenantIdAndIsGeofenceEnabledTrue(tenantId))
                .thenReturn(Collections.emptyList());

        OfficeLocationService.GeofenceValidationResult result =
                officeLocationService.validateGeofence(NEAR_LAT, NEAR_LNG);

        assertTrue(result.isValid());
        assertNull(result.nearestLocation());
        assertEquals("No geofence configured", result.message());
    }

    @Test
    void validateGeofence_MultipleLocations_ReturnsNearestValid() {
        // Create a second location further away
        OfficeLocation mumbaiLocation = OfficeLocation.builder()
                .locationName("Mumbai Office")
                .locationCode("MUM-001")
                .latitude(new BigDecimal("19.0760"))
                .longitude(new BigDecimal("72.8777"))
                .geofenceRadiusMeters(100)
                .isGeofenceEnabled(true)
                .allowRemoteCheckin(false)
                .build();
        mumbaiLocation.setId(UUID.randomUUID());
        mumbaiLocation.setTenantId(tenantId);

        when(officeLocationRepository.findAllByTenantIdAndIsGeofenceEnabledTrue(tenantId))
                .thenReturn(List.of(testLocation, mumbaiLocation));

        // Check-in from near Bangalore office
        OfficeLocationService.GeofenceValidationResult result =
                officeLocationService.validateGeofence(NEAR_LAT, NEAR_LNG);

        assertTrue(result.isValid());
        assertEquals("Bangalore HQ", result.nearestLocation().getLocationName());
    }

    // ================== Entity Method Tests ==================

    @Test
    void officeLocation_CalculateDistance_SameLocation_ReturnsZero() {
        double distance = testLocation.calculateDistance(
                OFFICE_LAT.doubleValue(),
                OFFICE_LNG.doubleValue()
        );

        assertEquals(0, distance, 1); // Should be very close to 0
    }

    @Test
    void officeLocation_CalculateDistance_NearbyLocation_ReturnsCorrectDistance() {
        // NEAR_LAT is approximately 44 meters north of OFFICE_LAT
        double distance = testLocation.calculateDistance(
                NEAR_LAT.doubleValue(),
                NEAR_LNG.doubleValue()
        );

        assertTrue(distance > 0);
        assertTrue(distance < 100); // Should be less than 100m
    }

    @Test
    void officeLocation_CalculateDistance_FarLocation_ReturnsLargerDistance() {
        // FAR_LAT is approximately 500 meters away
        double distance = testLocation.calculateDistance(
                FAR_LAT.doubleValue(),
                FAR_LNG.doubleValue()
        );

        assertTrue(distance > 400); // Should be significant distance
    }

    @Test
    void officeLocation_IsWithinGeofence_WithinRadius_ReturnsTrue() {
        boolean result = testLocation.isWithinGeofence(
                NEAR_LAT.doubleValue(),
                NEAR_LNG.doubleValue()
        );

        assertTrue(result);
    }

    @Test
    void officeLocation_IsWithinGeofence_OutsideRadius_ReturnsFalse() {
        boolean result = testLocation.isWithinGeofence(
                FAR_LAT.doubleValue(),
                FAR_LNG.doubleValue()
        );

        assertFalse(result);
    }

    @Test
    void officeLocation_IsWithinGeofence_GeofenceDisabled_AlwaysReturnsTrue() {
        testLocation.setIsGeofenceEnabled(false);

        boolean result = testLocation.isWithinGeofence(
                FAR_LAT.doubleValue(),
                FAR_LNG.doubleValue()
        );

        assertTrue(result); // Should always return true when geofence is disabled
    }

    @Test
    void officeLocation_IsWithinGeofence_LargerRadius_ReturnsTrue() {
        testLocation.setGeofenceRadiusMeters(1000); // 1km radius

        boolean result = testLocation.isWithinGeofence(
                FAR_LAT.doubleValue(),
                FAR_LNG.doubleValue()
        );

        assertTrue(result); // Should be within larger radius
    }
}
