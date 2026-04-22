package com.hrms.api.analytics.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.analytics.dto.DashboardAnalyticsResponse;
import com.hrms.api.analytics.dto.DashboardContext;
import com.hrms.application.analytics.dto.*;
import com.hrms.application.analytics.service.AnalyticsService;
import com.hrms.application.analytics.service.DashboardAnalyticsService;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalyticsController.class)
@ContextConfiguration(classes = {AnalyticsController.class, AnalyticsControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AnalyticsController Integration Tests")
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private AnalyticsService analyticsService;
    @MockitoBean
    private DashboardAnalyticsService dashboardAnalyticsService;
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

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Analytics Summary Tests")
    class AnalyticsSummaryTests {

        @Test
        @DisplayName("Should return analytics summary successfully")
        void shouldReturnAnalyticsSummarySuccessfully() throws Exception {
            AnalyticsSummary summary = AnalyticsSummary.builder()
                    .totalEmployees(250)
                    .presentToday(200)
                    .onLeaveToday(15)
                    .pendingApprovals(8)
                    .payrollProcessedThisMonth(true)
                    .openPositions(12)
                    .build();

            when(analyticsService.getAnalyticsSummary()).thenReturn(summary);

            mockMvc.perform(get("/api/v1/analytics/summary"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalEmployees").value(250))
                    .andExpect(jsonPath("$.presentToday").value(200))
                    .andExpect(jsonPath("$.onLeaveToday").value(15))
                    .andExpect(jsonPath("$.pendingApprovals").value(8))
                    .andExpect(jsonPath("$.payrollProcessedThisMonth").value(true))
                    .andExpect(jsonPath("$.openPositions").value(12));

            verify(analyticsService).getAnalyticsSummary();
        }
    }

    @Nested
    @DisplayName("Dashboard Analytics Tests")
    class DashboardAnalyticsTests {

        @Test
        @DisplayName("Should return dashboard analytics for admin user")
        void shouldReturnDashboardAnalyticsForAdmin() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {

                UUID tenantId = UUID.randomUUID();
                UUID userId = UUID.randomUUID();
                UUID employeeId = UUID.randomUUID();

                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                secCtx.when(SecurityContext::isHRManager).thenReturn(true);
                secCtx.when(SecurityContext::isManager).thenReturn(false);
                secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
                secCtx.when(SecurityContext::isSuperAdmin).thenReturn(false);

                DashboardContext context = DashboardContext.builder()
                        .tenantId(tenantId)
                        .userId(userId)
                        .employeeId(employeeId)
                        .viewType(DashboardContext.ViewType.ADMIN)
                        .build();

                DashboardAnalyticsResponse response = DashboardAnalyticsResponse.builder()
                        .viewType("ADMIN")
                        .viewLabel("Organization View")
                        .teamSize(250L)
                        .build();

                when(dashboardAnalyticsService.buildContext(
                        eq(tenantId), eq(userId), eq(employeeId), eq(true), eq(false)))
                        .thenReturn(context);
                when(dashboardAnalyticsService.getDashboardAnalytics(any(DashboardContext.class)))
                        .thenReturn(response);

                mockMvc.perform(get("/api/v1/analytics/dashboard"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.viewType").value("ADMIN"))
                        .andExpect(jsonPath("$.viewLabel").value("Organization View"));

                verify(dashboardAnalyticsService).buildContext(
                        eq(tenantId), eq(userId), eq(employeeId), eq(true), eq(false));
                verify(dashboardAnalyticsService).getDashboardAnalytics(any(DashboardContext.class));
            }
        }
    }

    @Nested
    @DisplayName("Dashboard Metrics Tests")
    class DashboardMetricsTests {

        @Test
        @DisplayName("Should return dashboard metrics successfully")
        void shouldReturnDashboardMetricsSuccessfully() throws Exception {
            DashboardMetrics metrics = DashboardMetrics.builder()
                    .generatedAt(LocalDate.now())
                    .employeeMetrics(EmployeeMetrics.builder()
                            .totalEmployees(250)
                            .activeEmployees(240)
                            .onLeaveToday(10)
                            .newHiresThisMonth(5)
                            .attritionRate(2.5)
                            .build())
                    .build();

            when(analyticsService.getDashboardMetrics()).thenReturn(metrics);

            mockMvc.perform(get("/api/v1/analytics/metrics"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeMetrics.totalEmployees").value(250))
                    .andExpect(jsonPath("$.employeeMetrics.activeEmployees").value(240));

            verify(analyticsService).getDashboardMetrics();
        }
    }

    @Nested
    @DisplayName("Employee Metrics Tests")
    class EmployeeMetricsTests {

        @Test
        @DisplayName("Should return employee metrics for current tenant")
        void shouldReturnEmployeeMetrics() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                UUID tenantId = UUID.randomUUID();
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                EmployeeMetrics metrics = EmployeeMetrics.builder()
                        .totalEmployees(100)
                        .activeEmployees(95)
                        .onLeaveToday(3)
                        .attritionRate(1.5)
                        .newHiresThisMonth(8)
                        .departmentDistribution(Map.of("Engineering", 40L, "HR", 10L))
                        .build();

                when(analyticsService.getEmployeeMetrics(tenantId)).thenReturn(metrics);

                mockMvc.perform(get("/api/v1/analytics/employees"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalEmployees").value(100))
                        .andExpect(jsonPath("$.activeEmployees").value(95))
                        .andExpect(jsonPath("$.newHiresThisMonth").value(8));

                verify(analyticsService).getEmployeeMetrics(tenantId);
            }
        }
    }

    @Nested
    @DisplayName("Headcount Trend Tests")
    class HeadcountTrendTests {

        @Test
        @DisplayName("Should return headcount trend with default months")
        void shouldReturnHeadcountTrendWithDefaultMonths() throws Exception {
            List<HeadcountTrend> trend = List.of(
                    new HeadcountTrend(2026, 1, 240),
                    new HeadcountTrend(2026, 2, 245),
                    new HeadcountTrend(2026, 3, 250));

            when(analyticsService.getHeadcountTrend(12)).thenReturn(trend);

            mockMvc.perform(get("/api/v1/analytics/headcount-trend"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(3)))
                    .andExpect(jsonPath("$[0].year").value(2026))
                    .andExpect(jsonPath("$[0].count").value(240));

            verify(analyticsService).getHeadcountTrend(12);
        }

        @Test
        @DisplayName("Should return headcount trend with custom months parameter")
        void shouldReturnHeadcountTrendWithCustomMonths() throws Exception {
            when(analyticsService.getHeadcountTrend(6)).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/analytics/headcount-trend")
                            .param("months", "6"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(analyticsService).getHeadcountTrend(6);
        }
    }

    @Nested
    @DisplayName("Leave Metrics Tests")
    class LeaveMetricsTests {

        @Test
        @DisplayName("Should return leave metrics for current month")
        void shouldReturnLeaveMetrics() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                UUID tenantId = UUID.randomUUID();
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                LeaveMetrics metrics = LeaveMetrics.builder()
                        .pendingRequests(5)
                        .approvedThisMonth(20)
                        .rejectedThisMonth(3)
                        .employeesOnLeaveToday(8)
                        .build();

                when(analyticsService.getLeaveMetrics(eq(tenantId), any(LocalDate.class), any(LocalDate.class)))
                        .thenReturn(metrics);

                mockMvc.perform(get("/api/v1/analytics/leave"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.pendingRequests").value(5))
                        .andExpect(jsonPath("$.approvedThisMonth").value(20))
                        .andExpect(jsonPath("$.employeesOnLeaveToday").value(8));

                verify(analyticsService).getLeaveMetrics(eq(tenantId), any(LocalDate.class), any(LocalDate.class));
            }
        }
    }

    @Nested
    @DisplayName("Payroll Metrics Tests")
    class PayrollMetricsTests {

        @Test
        @DisplayName("Should return payroll metrics for current month")
        void shouldReturnPayrollMetrics() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                UUID tenantId = UUID.randomUUID();
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                PayrollMetrics metrics = PayrollMetrics.builder()
                        .year(2026)
                        .month(4)
                        .totalGrossSalary(new BigDecimal("500000"))
                        .totalNetSalary(new BigDecimal("400000"))
                        .totalDeductions(new BigDecimal("100000"))
                        .employeesPaid(200)
                        .build();

                when(analyticsService.getPayrollMetrics(eq(tenantId), anyInt(), anyInt()))
                        .thenReturn(metrics);

                mockMvc.perform(get("/api/v1/analytics/payroll"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.year").value(2026))
                        .andExpect(jsonPath("$.month").value(4))
                        .andExpect(jsonPath("$.employeesPaid").value(200));

                verify(analyticsService).getPayrollMetrics(eq(tenantId), anyInt(), anyInt());
            }
        }
    }
}
