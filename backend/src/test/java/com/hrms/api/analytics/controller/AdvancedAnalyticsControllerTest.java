package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.*;
import com.hrms.application.analytics.service.AdvancedAnalyticsService;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdvancedAnalyticsController.class)
@ContextConfiguration(classes = {AdvancedAnalyticsController.class, AdvancedAnalyticsControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AdvancedAnalyticsController Unit Tests")
class AdvancedAnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private AdvancedAnalyticsService analyticsService;
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

    @Test
    @DisplayName("Should return analytics dashboard successfully")
    void shouldReturnAnalyticsDashboard() throws Exception {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalEmployees", 150);
        dashboard.put("attritionRate", 5.2);

        when(analyticsService.getAnalyticsDashboard()).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/analytics/advanced/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEmployees").value(150))
                .andExpect(jsonPath("$.attritionRate").value(5.2));

        verify(analyticsService).getAnalyticsDashboard();
    }

    @Test
    @DisplayName("Should return workforce analytics successfully")
    void shouldReturnWorkforceAnalytics() throws Exception {
        WorkforceAnalyticsResponse response = new WorkforceAnalyticsResponse();

        when(analyticsService.getWorkforceAnalytics()).thenReturn(response);

        mockMvc.perform(get("/api/v1/analytics/advanced/workforce"))
                .andExpect(status().isOk());

        verify(analyticsService).getWorkforceAnalytics();
    }

    @Test
    @DisplayName("Should return hiring analytics successfully")
    void shouldReturnHiringAnalytics() throws Exception {
        HiringAnalyticsResponse response = new HiringAnalyticsResponse();

        when(analyticsService.getHiringAnalytics()).thenReturn(response);

        mockMvc.perform(get("/api/v1/analytics/advanced/hiring"))
                .andExpect(status().isOk());

        verify(analyticsService).getHiringAnalytics();
    }

    @Test
    @DisplayName("Should return performance analytics successfully")
    void shouldReturnPerformanceAnalytics() throws Exception {
        PerformanceAnalyticsResponse response = new PerformanceAnalyticsResponse();

        when(analyticsService.getPerformanceAnalytics()).thenReturn(response);

        mockMvc.perform(get("/api/v1/analytics/advanced/performance"))
                .andExpect(status().isOk());

        verify(analyticsService).getPerformanceAnalytics();
    }

    @Test
    @DisplayName("Should return compensation analytics successfully")
    void shouldReturnCompensationAnalytics() throws Exception {
        CompensationAnalyticsResponse response = new CompensationAnalyticsResponse();

        when(analyticsService.getCompensationAnalytics()).thenReturn(response);

        mockMvc.perform(get("/api/v1/analytics/advanced/compensation"))
                .andExpect(status().isOk());

        verify(analyticsService).getCompensationAnalytics();
    }

    @Test
    @DisplayName("Should return attendance analytics successfully")
    void shouldReturnAttendanceAnalytics() throws Exception {
        AttendanceAnalyticsResponse response = new AttendanceAnalyticsResponse();

        when(analyticsService.getAttendanceAnalytics()).thenReturn(response);

        mockMvc.perform(get("/api/v1/analytics/advanced/attendance"))
                .andExpect(status().isOk());

        verify(analyticsService).getAttendanceAnalytics();
    }

    @Test
    @DisplayName("Should return empty dashboard when no data available")
    void shouldReturnEmptyDashboard() throws Exception {
        when(analyticsService.getAnalyticsDashboard()).thenReturn(Collections.emptyMap());

        mockMvc.perform(get("/api/v1/analytics/advanced/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());

        verify(analyticsService).getAnalyticsDashboard();
    }

    @Test
    @DisplayName("Should propagate service exception for workforce analytics")
    void shouldPropagateServiceException() throws Exception {
        when(analyticsService.getWorkforceAnalytics())
                .thenThrow(new RuntimeException("Service unavailable"));

        mockMvc.perform(get("/api/v1/analytics/advanced/workforce"))
                .andExpect(status().isInternalServerError());

        verify(analyticsService).getWorkforceAnalytics();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
