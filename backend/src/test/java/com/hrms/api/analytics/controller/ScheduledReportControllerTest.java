package com.hrms.api.analytics.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.analytics.dto.ScheduledReportRequest;
import com.hrms.api.analytics.dto.ScheduledReportResponse;
import com.hrms.application.analytics.service.ScheduledReportService;
import com.hrms.common.security.*;
import com.hrms.domain.analytics.ScheduledReport.Frequency;
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
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ScheduledReportController.class)
@ContextConfiguration(classes = {ScheduledReportController.class, ScheduledReportControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ScheduledReportController Unit Tests")
class ScheduledReportControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ScheduledReportService scheduledReportService;
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

    private UUID reportId;
    private UUID employeeId;
    private ScheduledReportResponse reportResponse;
    private ScheduledReportRequest reportRequest;

    @BeforeEach
    void setUp() {
        reportId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        reportResponse = ScheduledReportResponse.builder()
                .id(reportId)
                .scheduleName("Weekly Attendance Report")
                .reportType("ATTENDANCE")
                .frequency(Frequency.WEEKLY)
                .dayOfWeek(1)
                .timeOfDay(LocalTime.of(9, 0))
                .recipients(List.of("hr@nulogic.com"))
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .createdByName("Test User")
                .build();

        reportRequest = ScheduledReportRequest.builder()
                .scheduleName("Weekly Attendance Report")
                .reportType("ATTENDANCE")
                .frequency(Frequency.WEEKLY)
                .dayOfWeek(1)
                .timeOfDay(LocalTime.of(9, 0))
                .recipients(List.of("hr@nulogic.com"))
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
    @DisplayName("Should create scheduled report and return 201")
    void shouldCreateScheduledReport() throws Exception {
        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            when(scheduledReportService.createScheduledReport(any(ScheduledReportRequest.class), eq(employeeId)))
                    .thenReturn(reportResponse);

            mockMvc.perform(post("/api/v1/scheduled-reports")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reportRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(reportId.toString()))
                    .andExpect(jsonPath("$.scheduleName").value("Weekly Attendance Report"))
                    .andExpect(jsonPath("$.frequency").value("WEEKLY"));

            verify(scheduledReportService).createScheduledReport(any(ScheduledReportRequest.class), eq(employeeId));
        }
    }

    @Test
    @DisplayName("Should return 400 for invalid create request")
    void shouldReturn400ForInvalidCreateRequest() throws Exception {
        ScheduledReportRequest invalidRequest = new ScheduledReportRequest();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

            mockMvc.perform(post("/api/v1/scheduled-reports")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    @DisplayName("Should update scheduled report successfully")
    void shouldUpdateScheduledReport() throws Exception {
        ScheduledReportResponse updatedResponse = ScheduledReportResponse.builder()
                .id(reportId)
                .scheduleName("Updated Weekly Report")
                .reportType("ATTENDANCE")
                .frequency(Frequency.WEEKLY)
                .isActive(true)
                .build();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            when(scheduledReportService.updateScheduledReport(eq(reportId), any(ScheduledReportRequest.class), eq(employeeId)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/scheduled-reports/{id}", reportId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reportRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.scheduleName").value("Updated Weekly Report"));

            verify(scheduledReportService).updateScheduledReport(eq(reportId), any(ScheduledReportRequest.class), eq(employeeId));
        }
    }

    @Test
    @DisplayName("Should get scheduled report by ID")
    void shouldGetScheduledReportById() throws Exception {
        when(scheduledReportService.getScheduledReportById(reportId)).thenReturn(reportResponse);

        mockMvc.perform(get("/api/v1/scheduled-reports/{id}", reportId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reportId.toString()))
                .andExpect(jsonPath("$.scheduleName").value("Weekly Attendance Report"));

        verify(scheduledReportService).getScheduledReportById(reportId);
    }

    @Test
    @DisplayName("Should get all scheduled reports with pagination")
    void shouldGetAllScheduledReports() throws Exception {
        Page<ScheduledReportResponse> page = new PageImpl<>(
                List.of(reportResponse),
                PageRequest.of(0, 20),
                1
        );
        when(scheduledReportService.getAllScheduledReports(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/scheduled-reports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(scheduledReportService).getAllScheduledReports(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get active scheduled reports")
    void shouldGetActiveScheduledReports() throws Exception {
        when(scheduledReportService.getActiveScheduledReports()).thenReturn(List.of(reportResponse));

        mockMvc.perform(get("/api/v1/scheduled-reports/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].isActive").value(true));

        verify(scheduledReportService).getActiveScheduledReports();
    }

    @Test
    @DisplayName("Should delete scheduled report and return 204")
    void shouldDeleteScheduledReport() throws Exception {
        doNothing().when(scheduledReportService).deleteScheduledReport(reportId);

        mockMvc.perform(delete("/api/v1/scheduled-reports/{id}", reportId))
                .andExpect(status().isNoContent());

        verify(scheduledReportService).deleteScheduledReport(reportId);
    }

    @Test
    @DisplayName("Should toggle scheduled report status")
    void shouldToggleScheduledReportStatus() throws Exception {
        ScheduledReportResponse toggledResponse = ScheduledReportResponse.builder()
                .id(reportId)
                .scheduleName("Weekly Attendance Report")
                .isActive(false)
                .build();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            when(scheduledReportService.toggleStatus(reportId, employeeId)).thenReturn(toggledResponse);

            mockMvc.perform(post("/api/v1/scheduled-reports/{id}/toggle-status", reportId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(false));

            verify(scheduledReportService).toggleStatus(reportId, employeeId);
        }
    }

    @Test
    @DisplayName("Should handle pagination parameters for all reports")
    void shouldHandlePaginationParameters() throws Exception {
        Page<ScheduledReportResponse> page = new PageImpl<>(
                List.of(reportResponse),
                PageRequest.of(2, 10),
                50
        );
        when(scheduledReportService.getAllScheduledReports(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/scheduled-reports")
                        .param("page", "2")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(50));

        verify(scheduledReportService).getAllScheduledReports(any(Pageable.class));
    }
}
