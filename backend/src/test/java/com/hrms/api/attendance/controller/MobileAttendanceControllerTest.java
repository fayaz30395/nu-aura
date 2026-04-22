package com.hrms.api.attendance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.attendance.dto.*;
import com.hrms.application.attendance.service.MobileAttendanceService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

@WebMvcTest(MobileAttendanceController.class)
@ContextConfiguration(classes = {MobileAttendanceController.class, MobileAttendanceControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MobileAttendanceController Tests")
class MobileAttendanceControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MobileAttendanceService mobileAttendanceService;
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

    private MobileCheckInRequest checkInRequest;
    private MobileCheckInResponse checkInResponse;

    @BeforeEach
    void setUp() {
        checkInRequest = MobileCheckInRequest.builder()
                .latitude(new BigDecimal("12.9716"))
                .longitude(new BigDecimal("77.5946"))
                .accuracy(new BigDecimal("10.0"))
                .deviceId("device-123")
                .deviceModel("Pixel 7")
                .isMockLocation(false)
                .build();

        checkInResponse = MobileCheckInResponse.builder()
                .attendanceRecordId(UUID.randomUUID())
                .employeeId(UUID.randomUUID())
                .checkInTime(LocalDateTime.now())
                .withinGeofence(true)
                .nearestOfficeName("Bangalore HQ")
                .distanceFromOffice(50)
                .isRemoteCheckIn(false)
                .status("CHECKED_IN")
                .message("Check-in successful")
                .latitude(new BigDecimal("12.9716"))
                .longitude(new BigDecimal("77.5946"))
                .deviceVerified(true)
                .mockLocationDetected(false)
                .build();
    }

    @Test
    @DisplayName("Should check in successfully with valid GPS coordinates")
    void shouldCheckInSuccessfully() throws Exception {
        when(mobileAttendanceService.mobileCheckIn(any(MobileCheckInRequest.class)))
                .thenReturn(checkInResponse);

        mockMvc.perform(post("/api/v1/mobile/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkInRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CHECKED_IN"))
                .andExpect(jsonPath("$.withinGeofence").value(true))
                .andExpect(jsonPath("$.nearestOfficeName").value("Bangalore HQ"));

        verify(mobileAttendanceService).mobileCheckIn(any(MobileCheckInRequest.class));
    }

    @Test
    @DisplayName("Should check out successfully")
    void shouldCheckOutSuccessfully() throws Exception {
        MobileCheckInResponse checkOutResponse = MobileCheckInResponse.builder()
                .attendanceRecordId(UUID.randomUUID())
                .employeeId(UUID.randomUUID())
                .checkOutTime(LocalDateTime.now())
                .status("CHECKED_OUT")
                .message("Check-out successful")
                .workDurationMinutes(480)
                .build();

        when(mobileAttendanceService.mobileCheckOut(any(MobileCheckInRequest.class)))
                .thenReturn(checkOutResponse);

        mockMvc.perform(post("/api/v1/mobile/attendance/check-out")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkInRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CHECKED_OUT"))
                .andExpect(jsonPath("$.workDurationMinutes").value(480));

        verify(mobileAttendanceService).mobileCheckOut(any(MobileCheckInRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for missing latitude on check-in")
    void shouldReturn400ForMissingLatitude() throws Exception {
        MobileCheckInRequest invalidRequest = MobileCheckInRequest.builder()
                .longitude(new BigDecimal("77.5946"))
                .build();

        mockMvc.perform(post("/api/v1/mobile/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 for missing longitude on check-in")
    void shouldReturn400ForMissingLongitude() throws Exception {
        MobileCheckInRequest invalidRequest = MobileCheckInRequest.builder()
                .latitude(new BigDecimal("12.9716"))
                .build();

        mockMvc.perform(post("/api/v1/mobile/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should get mobile attendance dashboard")
    void shouldGetDashboard() throws Exception {
        MobileAttendanceDashboard dashboard = MobileAttendanceDashboard.builder()
                .isClockedIn(true)
                .currentStatus("CHECKED_IN")
                .lastCheckInTime(LocalDateTime.now())
                .build();

        when(mobileAttendanceService.getDashboard(any(), any())).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/mobile/attendance/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isClockedIn").value(true))
                .andExpect(jsonPath("$.currentStatus").value("CHECKED_IN"));

        verify(mobileAttendanceService).getDashboard(any(), any());
    }

    @Test
    @DisplayName("Should get dashboard with GPS coordinates")
    void shouldGetDashboardWithCoordinates() throws Exception {
        MobileAttendanceDashboard dashboard = MobileAttendanceDashboard.builder()
                .isClockedIn(false)
                .currentStatus("NOT_CHECKED_IN")
                .nearbyOffices(List.of(
                        MobileAttendanceDashboard.NearbyOffice.builder()
                                .officeId(UUID.randomUUID())
                                .officeName("Bangalore HQ")
                                .distanceMeters(150)
                                .withinGeofence(true)
                                .build()
                ))
                .build();

        when(mobileAttendanceService.getDashboard(any(BigDecimal.class), any(BigDecimal.class)))
                .thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/mobile/attendance/dashboard")
                        .param("latitude", "12.9716")
                        .param("longitude", "77.5946"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nearbyOffices", hasSize(1)));

        verify(mobileAttendanceService).getDashboard(any(BigDecimal.class), any(BigDecimal.class));
    }

    @Test
    @DisplayName("Should get nearby offices")
    void shouldGetNearbyOffices() throws Exception {
        UUID tenantId = UUID.randomUUID();
        List<MobileAttendanceDashboard.NearbyOffice> offices = List.of(
                MobileAttendanceDashboard.NearbyOffice.builder()
                        .officeId(UUID.randomUUID())
                        .officeName("Bangalore HQ")
                        .distanceMeters(100)
                        .withinGeofence(true)
                        .build()
        );

        try (MockedStatic<TenantContext> mockedTenant = mockStatic(TenantContext.class)) {
            mockedTenant.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(mobileAttendanceService.getNearbyOffices(
                    eq(tenantId), any(BigDecimal.class), any(BigDecimal.class)))
                    .thenReturn(offices);

            mockMvc.perform(get("/api/v1/mobile/attendance/nearby-offices")
                            .param("latitude", "12.9716")
                            .param("longitude", "77.5946"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].officeName").value("Bangalore HQ"));
        }
    }

    @Test
    @DisplayName("Should detect mock location flag")
    void shouldHandleMockLocationDetection() throws Exception {
        MobileCheckInRequest mockLocationRequest = MobileCheckInRequest.builder()
                .latitude(new BigDecimal("12.9716"))
                .longitude(new BigDecimal("77.5946"))
                .isMockLocation(true)
                .build();

        MobileCheckInResponse mockDetectedResponse = MobileCheckInResponse.builder()
                .status("REJECTED")
                .message("Mock location detected")
                .mockLocationDetected(true)
                .build();

        when(mobileAttendanceService.mobileCheckIn(any(MobileCheckInRequest.class)))
                .thenReturn(mockDetectedResponse);

        mockMvc.perform(post("/api/v1/mobile/attendance/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(mockLocationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mockLocationDetected").value(true));

        verify(mobileAttendanceService).mobileCheckIn(any(MobileCheckInRequest.class));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
