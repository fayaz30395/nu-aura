package com.hrms.api.analytics.controller;

import com.hrms.application.analytics.dto.*;
import com.hrms.api.analytics.dto.DashboardAnalyticsResponse;
import com.hrms.api.analytics.dto.DashboardContext;
import com.hrms.application.analytics.service.AnalyticsService;
import com.hrms.application.analytics.service.DashboardAnalyticsService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalyticsController.class)
@ContextConfiguration(classes = {AnalyticsController.class, AnalyticsControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AnalyticsController Unit Tests")
class AnalyticsControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public JpaMetamodelMappingContext jpaMetamodelMappingContext() {
            return new JpaMetamodelMappingContext();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AnalyticsService analyticsService;

    @MockBean
    private DashboardAnalyticsService dashboardAnalyticsService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilter tenantFilter;

    private UUID tenantId;
    private UUID userId;
    private UUID employeeId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("GET /api/v1/analytics/summary")
    class AnalyticsSummaryTests {

        @Test
        @DisplayName("Should return analytics summary with all KPI fields")
        void shouldReturnAnalyticsSummary() throws Exception {
            AnalyticsSummary summary = new AnalyticsSummary();
            summary.setTotalEmployees(150);
            summary.setPresentToday(130);
            summary.setOnLeaveToday(8);
            summary.setPendingApprovals(12);
            summary.setPayrollProcessedThisMonth(true);
            summary.setOpenPositions(5);

            when(analyticsService.getAnalyticsSummary()).thenReturn(summary);

            mockMvc.perform(get("/api/v1/analytics/summary"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalEmployees").value(150))
                    .andExpect(jsonPath("$.presentToday").value(130))
                    .andExpect(jsonPath("$.onLeaveToday").value(8))
                    .andExpect(jsonPath("$.pendingApprovals").value(12))
                    .andExpect(jsonPath("$.payrollProcessedThisMonth").value(true))
                    .andExpect(jsonPath("$.openPositions").value(5));

            verify(analyticsService).getAnalyticsSummary();
        }

        @Test
        @DisplayName("Should return summary with zero values when no data exists")
        void shouldReturnSummaryWithZeroValues() throws Exception {
            AnalyticsSummary emptySummary = new AnalyticsSummary();
            emptySummary.setTotalEmployees(0);
            emptySummary.setPresentToday(0);
            emptySummary.setOnLeaveToday(0);
            emptySummary.setPendingApprovals(0);
            emptySummary.setPayrollProcessedThisMonth(false);
            emptySummary.setOpenPositions(0);

            when(analyticsService.getAnalyticsSummary()).thenReturn(emptySummary);

            mockMvc.perform(get("/api/v1/analytics/summary"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalEmployees").value(0));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/analytics/dashboard — Role-based dashboard")
    class DashboardAnalyticsTests {

        @Test
        @DisplayName("Should return admin dashboard analytics")
        void shouldReturnAdminDashboard() throws Exception {
            DashboardAnalyticsResponse dashboardResponse = new DashboardAnalyticsResponse();
            dashboardResponse.setViewType("ADMIN");

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {

                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                secCtx.when(SecurityContext::isHRManager).thenReturn(true);
                secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
                secCtx.when(SecurityContext::isSuperAdmin).thenReturn(false);
                secCtx.when(SecurityContext::isManager).thenReturn(false);

                DashboardContext context = new DashboardContext();
                when(dashboardAnalyticsService.buildContext(
                        eq(tenantId), eq(userId), eq(employeeId), eq(true), eq(false)))
                        .thenReturn(context);
                when(dashboardAnalyticsService.getDashboardAnalytics(context))
                        .thenReturn(dashboardResponse);

                mockMvc.perform(get("/api/v1/analytics/dashboard"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.viewType").value("ADMIN"));

                verify(dashboardAnalyticsService).buildContext(
                        eq(tenantId), eq(userId), eq(employeeId), eq(true), eq(false));
                verify(dashboardAnalyticsService).getDashboardAnalytics(context);
            }
        }

        @Test
        @DisplayName("Should return manager dashboard when user is manager")
        void shouldReturnManagerDashboard() throws Exception {
            DashboardAnalyticsResponse dashboardResponse = new DashboardAnalyticsResponse();
            dashboardResponse.setViewType("MANAGER");

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {

                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                secCtx.when(SecurityContext::isHRManager).thenReturn(false);
                secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
                secCtx.when(SecurityContext::isSuperAdmin).thenReturn(false);
                secCtx.when(SecurityContext::isManager).thenReturn(true);

                DashboardContext context = new DashboardContext();
                when(dashboardAnalyticsService.buildContext(
                        eq(tenantId), eq(userId), eq(employeeId), eq(false), eq(true)))
                        .thenReturn(context);
                when(dashboardAnalyticsService.getDashboardAnalytics(context))
                        .thenReturn(dashboardResponse);

                mockMvc.perform(get("/api/v1/analytics/dashboard"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.viewType").value("MANAGER"));
            }
        }

        @Test
        @DisplayName("Should return employee dashboard when user is neither admin nor manager")
        void shouldReturnEmployeeDashboard() throws Exception {
            DashboardAnalyticsResponse dashboardResponse = new DashboardAnalyticsResponse();
            dashboardResponse.setViewType("EMPLOYEE");

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {

                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                secCtx.when(SecurityContext::isHRManager).thenReturn(false);
                secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
                secCtx.when(SecurityContext::isSuperAdmin).thenReturn(false);
                secCtx.when(SecurityContext::isManager).thenReturn(false);

                DashboardContext context = new DashboardContext();
                when(dashboardAnalyticsService.buildContext(
                        eq(tenantId), eq(userId), eq(employeeId), eq(false), eq(false)))
                        .thenReturn(context);
                when(dashboardAnalyticsService.getDashboardAnalytics(context))
                        .thenReturn(dashboardResponse);

                mockMvc.perform(get("/api/v1/analytics/dashboard"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.viewType").value("EMPLOYEE"));
            }
        }
    }

    @Nested
    @DisplayName("GET /api/v1/analytics/metrics")
    class DashboardMetricsTests {

        @Test
        @DisplayName("Should return dashboard metrics")
        void shouldReturnDashboardMetrics() throws Exception {
            DashboardMetrics metrics = new DashboardMetrics();
            metrics.setTotalHeadcount(150);
            metrics.setNewHiresThisMonth(5);
            metrics.setAttritionThisMonth(2);
            metrics.setAttritionRate(new BigDecimal("1.33"));

            when(analyticsService.getDashboardMetrics()).thenReturn(metrics);

            mockMvc.perform(get("/api/v1/analytics/metrics"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalHeadcount").value(150))
                    .andExpect(jsonPath("$.newHiresThisMonth").value(5))
                    .andExpect(jsonPath("$.attritionThisMonth").value(2));

            verify(analyticsService).getDashboardMetrics();
        }
    }

    @Nested
    @DisplayName("GET /api/v1/analytics/employees")
    class EmployeeMetricsTests {

        @Test
        @DisplayName("Should return employee metrics for current tenant")
        void shouldReturnEmployeeMetrics() throws Exception {
            EmployeeMetrics metrics = new EmployeeMetrics();
            metrics.setTotalActive(145);
            metrics.setTotalInactive(5);
            metrics.setNewJoinees(3);
            metrics.setExits(1);

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(analyticsService.getEmployeeMetrics(tenantId)).thenReturn(metrics);

                mockMvc.perform(get("/api/v1/analytics/employees"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalActive").value(145))
                        .andExpect(jsonPath("$.totalInactive").value(5))
                        .andExpect(jsonPath("$.newJoinees").value(3))
                        .andExpect(jsonPath("$.exits").value(1));

                verify(analyticsService).getEmployeeMetrics(tenantId);
            }
        }
    }

    @Nested
    @DisplayName("GET /api/v1/analytics/headcount-trend")
    class HeadcountTrendTests {

        @Test
        @DisplayName("Should return headcount trend for default 12 months")
        void shouldReturnHeadcountTrendDefault() throws Exception {
            HeadcountTrend trend1 = new HeadcountTrend("2024-10", 140);
            HeadcountTrend trend2 = new HeadcountTrend("2024-11", 143);
            HeadcountTrend trend3 = new HeadcountTrend("2024-12", 148);

            when(analyticsService.getHeadcountTrend(12))
                    .thenReturn(List.of(trend1, trend2, trend3));

            mockMvc.perform(get("/api/v1/analytics/headcount-trend"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(3))
                    .andExpect(jsonPath("$[0].period").value("2024-10"))
                    .andExpect(jsonPath("$[0].headcount").value(140));

            verify(analyticsService).getHeadcountTrend(12);
        }

        @Test
        @DisplayName("Should return headcount trend for custom month range")
        void shouldReturnHeadcountTrendCustomMonths() throws Exception {
            when(analyticsService.getHeadcountTrend(6)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/analytics/headcount-trend")
                            .param("months", "6"))
                    .andExpect(status().isOk());

            verify(analyticsService).getHeadcountTrend(6);
        }

        @Test
        @DisplayName("Should return empty trend when no data")
        void shouldReturnEmptyTrendWhenNoData() throws Exception {
            when(analyticsService.getHeadcountTrend(12)).thenReturn(List.of());

            mockMvc.perform(get("/api/v1/analytics/headcount-trend"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/analytics/leave")
    class LeaveMetricsTests {

        @Test
        @DisplayName("Should return leave metrics for current month")
        void shouldReturnLeaveMetricsForCurrentMonth() throws Exception {
            LeaveMetrics leaveMetrics = new LeaveMetrics();
            leaveMetrics.setTotalRequests(25);
            leaveMetrics.setApprovedRequests(20);
            leaveMetrics.setPendingRequests(3);
            leaveMetrics.setRejectedRequests(2);
            leaveMetrics.setTotalDaysTaken(new BigDecimal("48.5"));

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(analyticsService.getLeaveMetrics(eq(tenantId), any(), any()))
                        .thenReturn(leaveMetrics);

                mockMvc.perform(get("/api/v1/analytics/leave"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalRequests").value(25))
                        .andExpect(jsonPath("$.approvedRequests").value(20))
                        .andExpect(jsonPath("$.pendingRequests").value(3))
                        .andExpect(jsonPath("$.rejectedRequests").value(2));

                verify(analyticsService).getLeaveMetrics(eq(tenantId), any(), any());
            }
        }
    }

    @Nested
    @DisplayName("GET /api/v1/analytics/payroll")
    class PayrollMetricsTests {

        @Test
        @DisplayName("Should return payroll metrics for current month")
        void shouldReturnPayrollMetricsForCurrentMonth() throws Exception {
            PayrollMetrics payrollMetrics = new PayrollMetrics();
            payrollMetrics.setTotalGrossSalary(new BigDecimal("7500000"));
            payrollMetrics.setTotalNetSalary(new BigDecimal("6200000"));
            payrollMetrics.setTotalDeductions(new BigDecimal("1300000"));
            payrollMetrics.setEmployeeCount(150);
            payrollMetrics.setPayrollRunStatus("APPROVED");

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(analyticsService.getPayrollMetrics(eq(tenantId), anyInt(), anyInt()))
                        .thenReturn(payrollMetrics);

                mockMvc.perform(get("/api/v1/analytics/payroll"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.employeeCount").value(150))
                        .andExpect(jsonPath("$.payrollRunStatus").value("APPROVED"));

                verify(analyticsService).getPayrollMetrics(eq(tenantId), anyInt(), anyInt());
            }
        }

        @Test
        @DisplayName("Should return payroll metrics with zero values when no payroll run")
        void shouldReturnPayrollMetricsWithZeroValuesWhenNoRun() throws Exception {
            PayrollMetrics emptyMetrics = new PayrollMetrics();
            emptyMetrics.setTotalGrossSalary(BigDecimal.ZERO);
            emptyMetrics.setTotalNetSalary(BigDecimal.ZERO);
            emptyMetrics.setEmployeeCount(0);
            emptyMetrics.setPayrollRunStatus("NONE");

            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(analyticsService.getPayrollMetrics(eq(tenantId), anyInt(), anyInt()))
                        .thenReturn(emptyMetrics);

                mockMvc.perform(get("/api/v1/analytics/payroll"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.employeeCount").value(0))
                        .andExpect(jsonPath("$.payrollRunStatus").value("NONE"));
            }
        }
    }
}
