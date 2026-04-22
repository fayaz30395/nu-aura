package com.hrms.api.shift.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.shift.dto.*;
import com.hrms.application.shift.service.ShiftManagementService;
import com.hrms.application.shift.service.ShiftPatternService;
import com.hrms.application.shift.service.ShiftScheduleService;
import com.hrms.common.security.*;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ShiftManagementController.class)
@ContextConfiguration(classes = {ShiftManagementController.class, ShiftManagementControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ShiftManagementController Tests")
class ShiftManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ShiftManagementService shiftManagementService;
    @MockitoBean
    private ShiftPatternService shiftPatternService;
    @MockitoBean
    private ShiftScheduleService shiftScheduleService;
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

    private UUID shiftId;
    private ShiftResponse shiftResponse;
    private ShiftRequest shiftRequest;

    @BeforeEach
    void setUp() {
        shiftId = UUID.randomUUID();

        shiftResponse = ShiftResponse.builder()
                .id(shiftId)
                .shiftCode("GEN-DAY")
                .shiftName("General Day Shift")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .gracePeriodInMinutes(15)
                .fullDayHours(new BigDecimal("8.0"))
                .breakDurationMinutes(60)
                .isNightShift(false)
                .isActive(true)
                .workingDays("MON,TUE,WED,THU,FRI")
                .createdAt(LocalDateTime.now())
                .build();

        shiftRequest = ShiftRequest.builder()
                .shiftCode("GEN-DAY")
                .shiftName("General Day Shift")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .build();
    }

    @Test
    @DisplayName("Should create shift successfully")
    void shouldCreateShift() throws Exception {
        when(shiftManagementService.createShift(any(ShiftRequest.class)))
                .thenReturn(shiftResponse);

        mockMvc.perform(post("/api/v1/shifts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shiftRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shiftCode").value("GEN-DAY"))
                .andExpect(jsonPath("$.shiftName").value("General Day Shift"));

        verify(shiftManagementService).createShift(any(ShiftRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid shift request")
    void shouldReturn400ForInvalidRequest() throws Exception {
        ShiftRequest invalidRequest = new ShiftRequest();

        mockMvc.perform(post("/api/v1/shifts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should update shift successfully")
    void shouldUpdateShift() throws Exception {
        when(shiftManagementService.updateShift(eq(shiftId), any(ShiftRequest.class)))
                .thenReturn(shiftResponse);

        mockMvc.perform(put("/api/v1/shifts/{shiftId}", shiftId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shiftRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shiftCode").value("GEN-DAY"));

        verify(shiftManagementService).updateShift(eq(shiftId), any(ShiftRequest.class));
    }

    @Test
    @DisplayName("Should get shift by ID")
    void shouldGetShiftById() throws Exception {
        when(shiftManagementService.getShiftById(shiftId)).thenReturn(shiftResponse);

        mockMvc.perform(get("/api/v1/shifts/{shiftId}", shiftId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(shiftId.toString()))
                .andExpect(jsonPath("$.shiftName").value("General Day Shift"));

        verify(shiftManagementService).getShiftById(shiftId);
    }

    @Test
    @DisplayName("Should get all shifts with pagination")
    void shouldGetAllShifts() throws Exception {
        Page<ShiftResponse> page = new PageImpl<>(
                Collections.singletonList(shiftResponse), PageRequest.of(0, 10), 1);

        when(shiftManagementService.getAllShifts(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/shifts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(shiftManagementService).getAllShifts(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get active shifts")
    void shouldGetActiveShifts() throws Exception {
        when(shiftManagementService.getActiveShifts())
                .thenReturn(Collections.singletonList(shiftResponse));

        mockMvc.perform(get("/api/v1/shifts/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].isActive").value(true));

        verify(shiftManagementService).getActiveShifts();
    }

    @Test
    @DisplayName("Should delete shift")
    void shouldDeleteShift() throws Exception {
        doNothing().when(shiftManagementService).deleteShift(shiftId);

        mockMvc.perform(delete("/api/v1/shifts/{shiftId}", shiftId))
                .andExpect(status().isNoContent());

        verify(shiftManagementService).deleteShift(shiftId);
    }

    @Test
    @DisplayName("Should activate shift")
    void shouldActivateShift() throws Exception {
        ShiftResponse activatedResponse = ShiftResponse.builder()
                .id(shiftId)
                .isActive(true)
                .build();

        when(shiftManagementService.activateShift(shiftId)).thenReturn(activatedResponse);

        mockMvc.perform(patch("/api/v1/shifts/{shiftId}/activate", shiftId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));

        verify(shiftManagementService).activateShift(shiftId);
    }

    @Test
    @DisplayName("Should assign shift to employee")
    void shouldAssignShift() throws Exception {
        UUID employeeId = UUID.randomUUID();
        ShiftAssignmentRequest assignRequest = ShiftAssignmentRequest.builder()
                .employeeId(employeeId)
                .shiftId(shiftId)
                .assignmentDate(LocalDate.now())
                .effectiveFrom(LocalDate.now())
                .assignmentType("PERMANENT")
                .build();

        ShiftAssignmentResponse assignResponse = ShiftAssignmentResponse.builder()
                .id(UUID.randomUUID())
                .employeeId(employeeId)
                .shiftId(shiftId)
                .shiftName("General Day Shift")
                .assignmentType("PERMANENT")
                .status("ACTIVE")
                .build();

        when(shiftManagementService.assignShiftToEmployee(any(ShiftAssignmentRequest.class)))
                .thenReturn(assignResponse);

        mockMvc.perform(post("/api/v1/shifts/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shiftName").value("General Day Shift"))
                .andExpect(jsonPath("$.assignmentType").value("PERMANENT"));

        verify(shiftManagementService).assignShiftToEmployee(any(ShiftAssignmentRequest.class));
    }

    @Test
    @DisplayName("Should create shift pattern")
    void shouldCreateShiftPattern() throws Exception {
        ShiftPatternRequest patternRequest = ShiftPatternRequest.builder()
                .name("Weekly Rotation")
                .rotationType("WEEKLY_ROTATING")
                .pattern("[\"shift1\",\"shift1\",\"shift2\",\"shift2\",\"OFF\"]")
                .cycleDays(5)
                .build();

        ShiftPatternResponse patternResponse = ShiftPatternResponse.builder()
                .id(UUID.randomUUID())
                .name("Weekly Rotation")
                .rotationType("WEEKLY_ROTATING")
                .cycleDays(5)
                .isActive(true)
                .build();

        when(shiftPatternService.createPattern(any(ShiftPatternRequest.class)))
                .thenReturn(patternResponse);

        mockMvc.perform(post("/api/v1/shifts/patterns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patternRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Weekly Rotation"))
                .andExpect(jsonPath("$.rotationType").value("WEEKLY_ROTATING"));

        verify(shiftPatternService).createPattern(any(ShiftPatternRequest.class));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
