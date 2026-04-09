package com.hrms.api.timetracking.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.timetracking.dto.CreateTimeEntryRequest;
import com.hrms.api.timetracking.dto.TimeEntryDto;
import com.hrms.application.timetracking.service.TimeTrackingService;
import com.hrms.common.security.*;
import com.hrms.domain.timetracking.TimeEntry.TimeEntryStatus;
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

@WebMvcTest(TimeTrackingController.class)
@ContextConfiguration(classes = {TimeTrackingController.class, TimeTrackingControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TimeTrackingController Tests")
class TimeTrackingControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private TimeTrackingService timeTrackingService;
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

    private UUID entryId;
    private UUID projectId;
    private TimeEntryDto timeEntryDto;
    private CreateTimeEntryRequest createRequest;

    @BeforeEach
    void setUp() {
        entryId = UUID.randomUUID();
        projectId = UUID.randomUUID();

        timeEntryDto = TimeEntryDto.builder()
                .id(entryId)
                .employeeId(UUID.randomUUID())
                .employeeName("John Doe")
                .projectId(projectId)
                .projectName("NU-AURA")
                .entryDate(LocalDate.now())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .hoursWorked(new BigDecimal("8.0"))
                .billableHours(new BigDecimal("7.5"))
                .isBillable(true)
                .status(TimeEntryStatus.DRAFT)
                .description("Development work")
                .createdAt(LocalDateTime.now())
                .build();

        createRequest = CreateTimeEntryRequest.builder()
                .projectId(projectId)
                .entryDate(LocalDate.now())
                .hoursWorked(new BigDecimal("8.0"))
                .description("Development work")
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create time entry successfully")
    void shouldCreateTimeEntry() throws Exception {
        when(timeTrackingService.createEntry(any(CreateTimeEntryRequest.class)))
                .thenReturn(timeEntryDto);

        mockMvc.perform(post("/api/v1/time-tracking/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(entryId.toString()))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.hoursWorked").value(8.0));

        verify(timeTrackingService).createEntry(any(CreateTimeEntryRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid time entry request")
    void shouldReturn400ForInvalidRequest() throws Exception {
        CreateTimeEntryRequest invalidRequest = new CreateTimeEntryRequest();

        mockMvc.perform(post("/api/v1/time-tracking/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should update time entry")
    void shouldUpdateTimeEntry() throws Exception {
        when(timeTrackingService.updateEntry(eq(entryId), any(CreateTimeEntryRequest.class)))
                .thenReturn(timeEntryDto);

        mockMvc.perform(put("/api/v1/time-tracking/entries/{id}", entryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(entryId.toString()));

        verify(timeTrackingService).updateEntry(eq(entryId), any(CreateTimeEntryRequest.class));
    }

    @Test
    @DisplayName("Should get time entry by ID")
    void shouldGetTimeEntryById() throws Exception {
        when(timeTrackingService.getById(entryId)).thenReturn(timeEntryDto);

        mockMvc.perform(get("/api/v1/time-tracking/entries/{id}", entryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(entryId.toString()))
                .andExpect(jsonPath("$.description").value("Development work"));

        verify(timeTrackingService).getById(entryId);
    }

    @Test
    @DisplayName("Should delete time entry")
    void shouldDeleteTimeEntry() throws Exception {
        doNothing().when(timeTrackingService).deleteEntry(entryId);

        mockMvc.perform(delete("/api/v1/time-tracking/entries/{id}", entryId))
                .andExpect(status().isNoContent());

        verify(timeTrackingService).deleteEntry(entryId);
    }

    @Test
    @DisplayName("Should submit time entry for approval")
    void shouldSubmitTimeEntry() throws Exception {
        TimeEntryDto submittedDto = TimeEntryDto.builder()
                .id(entryId)
                .status(TimeEntryStatus.SUBMITTED)
                .submittedDate(LocalDate.now())
                .build();

        when(timeTrackingService.submitEntry(entryId)).thenReturn(submittedDto);

        mockMvc.perform(post("/api/v1/time-tracking/entries/{id}/submit", entryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        verify(timeTrackingService).submitEntry(entryId);
    }

    @Test
    @DisplayName("Should approve time entry")
    void shouldApproveTimeEntry() throws Exception {
        TimeEntryDto approvedDto = TimeEntryDto.builder()
                .id(entryId)
                .status(TimeEntryStatus.APPROVED)
                .approvedDate(LocalDate.now())
                .build();

        when(timeTrackingService.approveEntry(entryId)).thenReturn(approvedDto);

        mockMvc.perform(post("/api/v1/time-tracking/entries/{id}/approve", entryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(timeTrackingService).approveEntry(entryId);
    }

    @Test
    @DisplayName("Should reject time entry with reason")
    void shouldRejectTimeEntry() throws Exception {
        TimeEntryDto rejectedDto = TimeEntryDto.builder()
                .id(entryId)
                .status(TimeEntryStatus.REJECTED)
                .rejectionReason("Hours seem too high")
                .build();

        when(timeTrackingService.rejectEntry(eq(entryId), anyString()))
                .thenReturn(rejectedDto);

        Map<String, String> body = Map.of("reason", "Hours seem too high");

        mockMvc.perform(post("/api/v1/time-tracking/entries/{id}/reject", entryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        verify(timeTrackingService).rejectEntry(eq(entryId), anyString());
    }

    @Test
    @DisplayName("Should get my time entries with pagination")
    void shouldGetMyEntries() throws Exception {
        Page<TimeEntryDto> page = new PageImpl<>(
                Collections.singletonList(timeEntryDto), PageRequest.of(0, 20), 1);

        when(timeTrackingService.getMyEntries(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/time-tracking/entries/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(timeTrackingService).getMyEntries(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get time summary for date range")
    void shouldGetTimeSummary() throws Exception {
        LocalDate startDate = LocalDate.now().minusDays(7);
        LocalDate endDate = LocalDate.now();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalHours", 40.0);
        summary.put("billableHours", 35.0);
        summary.put("entriesCount", 5);

        when(timeTrackingService.getTimeSummary(eq(startDate), eq(endDate)))
                .thenReturn(summary);

        mockMvc.perform(get("/api/v1/time-tracking/summary")
                        .param("startDate", startDate.toString())
                        .param("endDate", endDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalHours").value(40.0))
                .andExpect(jsonPath("$.billableHours").value(35.0));

        verify(timeTrackingService).getTimeSummary(startDate, endDate);
    }
}
