package com.hrms.api.attendance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.OfficeLocationService;
import com.hrms.common.security.*;
import com.hrms.domain.attendance.OfficeLocation;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OfficeLocationController.class)
@ContextConfiguration(classes = {OfficeLocationController.class, OfficeLocationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OfficeLocationController Tests")
class OfficeLocationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private OfficeLocationService officeLocationService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID locationId;
    private OfficeLocation officeLocation;
    private OfficeLocationRequest locationRequest;

    @BeforeEach
    void setUp() {
        locationId = UUID.randomUUID();

        officeLocation = OfficeLocation.builder()
                .locationName("Bangalore HQ")
                .locationCode("BLR-HQ")
                .address("123 Tech Park, Whitefield")
                .city("Bangalore")
                .state("Karnataka")
                .country("India")
                .zipCode("560066")
                .latitude(new BigDecimal("12.9716"))
                .longitude(new BigDecimal("77.5946"))
                .geofenceRadiusMeters(200)
                .isGeofenceEnabled(true)
                .allowRemoteCheckin(false)
                .isHeadquarters(true)
                .isActive(true)
                .timezone("Asia/Kolkata")
                .workingDays("MON,TUE,WED,THU,FRI")
                .build();
        officeLocation.setId(locationId);
        officeLocation.setCreatedAt(LocalDateTime.now());
        officeLocation.setUpdatedAt(LocalDateTime.now());

        locationRequest = new OfficeLocationRequest();
        locationRequest.setLocationName("Bangalore HQ");
        locationRequest.setLocationCode("BLR-HQ");
        locationRequest.setLatitude(new BigDecimal("12.9716"));
        locationRequest.setLongitude(new BigDecimal("77.5946"));
        locationRequest.setGeofenceRadiusMeters(200);
    }

    @Test
    @DisplayName("Should create office location successfully")
    void shouldCreateLocation() throws Exception {
        when(officeLocationService.createLocation(any(OfficeLocation.class)))
                .thenReturn(officeLocation);

        mockMvc.perform(post("/api/v1/office-locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(locationRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.locationName").value("Bangalore HQ"))
                .andExpect(jsonPath("$.locationCode").value("BLR-HQ"));

        verify(officeLocationService).createLocation(any(OfficeLocation.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid location request")
    void shouldReturn400ForInvalidRequest() throws Exception {
        OfficeLocationRequest invalidRequest = new OfficeLocationRequest();

        mockMvc.perform(post("/api/v1/office-locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should update office location")
    void shouldUpdateLocation() throws Exception {
        when(officeLocationService.updateLocation(eq(locationId), any(OfficeLocation.class)))
                .thenReturn(officeLocation);

        mockMvc.perform(put("/api/v1/office-locations/{id}", locationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(locationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locationName").value("Bangalore HQ"));

        verify(officeLocationService).updateLocation(eq(locationId), any(OfficeLocation.class));
    }

    @Test
    @DisplayName("Should get all locations with pagination")
    void shouldGetAllLocations() throws Exception {
        Page<OfficeLocation> page = new PageImpl<>(
                Collections.singletonList(officeLocation), PageRequest.of(0, 20), 1);

        when(officeLocationService.getAllLocations(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/office-locations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(officeLocationService).getAllLocations(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get active locations")
    void shouldGetActiveLocations() throws Exception {
        when(officeLocationService.getActiveLocations())
                .thenReturn(Collections.singletonList(officeLocation));

        mockMvc.perform(get("/api/v1/office-locations/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].locationCode").value("BLR-HQ"));

        verify(officeLocationService).getActiveLocations();
    }

    @Test
    @DisplayName("Should get location by ID")
    void shouldGetLocationById() throws Exception {
        when(officeLocationService.getLocationById(locationId))
                .thenReturn(Optional.of(officeLocation));

        mockMvc.perform(get("/api/v1/office-locations/{id}", locationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locationName").value("Bangalore HQ"));

        verify(officeLocationService).getLocationById(locationId);
    }

    @Test
    @DisplayName("Should return 404 for non-existent location")
    void shouldReturn404ForNonExistentLocation() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(officeLocationService.getLocationById(nonExistentId))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/office-locations/{id}", nonExistentId))
                .andExpect(status().isNotFound());

        verify(officeLocationService).getLocationById(nonExistentId);
    }

    @Test
    @DisplayName("Should delete office location")
    void shouldDeleteLocation() throws Exception {
        doNothing().when(officeLocationService).deleteLocation(locationId);

        mockMvc.perform(delete("/api/v1/office-locations/{id}", locationId))
                .andExpect(status().isNoContent());

        verify(officeLocationService).deleteLocation(locationId);
    }

    @Test
    @DisplayName("Should validate geofence successfully")
    void shouldValidateGeofence() throws Exception {
        GeofenceValidationRequest request = new GeofenceValidationRequest();
        request.setLatitude(new BigDecimal("12.9716"));
        request.setLongitude(new BigDecimal("77.5946"));

        OfficeLocationService.GeofenceValidationResult result =
                new OfficeLocationService.GeofenceValidationResult(
                        true, officeLocation, 50, "Within geofence of Bangalore HQ");

        when(officeLocationService.validateGeofence(any(BigDecimal.class), any(BigDecimal.class)))
                .thenReturn(result);

        mockMvc.perform(post("/api/v1/office-locations/validate-geofence")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.nearestLocationName").value("Bangalore HQ"));

        verify(officeLocationService).validateGeofence(any(BigDecimal.class), any(BigDecimal.class));
    }

    @Test
    @DisplayName("Should validate geofence outside radius")
    void shouldValidateGeofenceOutsideRadius() throws Exception {
        GeofenceValidationRequest request = new GeofenceValidationRequest();
        request.setLatitude(new BigDecimal("13.0000"));
        request.setLongitude(new BigDecimal("78.0000"));

        OfficeLocationService.GeofenceValidationResult result =
                new OfficeLocationService.GeofenceValidationResult(
                        false, null, 5000, "Not within any configured geofence");

        when(officeLocationService.validateGeofence(any(BigDecimal.class), any(BigDecimal.class)))
                .thenReturn(result);

        mockMvc.perform(post("/api/v1/office-locations/validate-geofence")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.withinGeofence").value(false));

        verify(officeLocationService).validateGeofence(any(BigDecimal.class), any(BigDecimal.class));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
