package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.*;
import com.hrms.application.analytics.service.*;
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

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardsController.class)
@ContextConfiguration(classes = {DashboardsController.class, DashboardsControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("DashboardsController Unit Tests")
class DashboardsControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private ExecutiveDashboardService executiveDashboardService;
    @MockitoBean
    private DashboardAnalyticsService hrOperationsDashboardService;
    @MockitoBean
    private ManagerDashboardService managerDashboardService;
    @MockitoBean
    private EmployeeDashboardService employeeDashboardService;
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

    private UUID tenantId;
    private UUID userId;
    private UUID employeeId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should return executive dashboard successfully")
    void shouldReturnExecutiveDashboard() throws Exception {
        ExecutiveDashboardResponse response = new ExecutiveDashboardResponse();
        when(executiveDashboardService.getExecutiveDashboard()).thenReturn(response);

        mockMvc.perform(get("/api/v1/dashboards/executive"))
                .andExpect(status().isOk());

        verify(executiveDashboardService).getExecutiveDashboard();
    }

    @Test
    @DisplayName("Should return HR operations dashboard successfully")
    void shouldReturnHrOperationsDashboard() throws Exception {
        DashboardContext context = mock(DashboardContext.class);
        DashboardAnalyticsResponse response = new DashboardAnalyticsResponse();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class);
             MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {

            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
            secCtx.when(SecurityContext::isHRManager).thenReturn(true);
            secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
            secCtx.when(SecurityContext::isSuperAdmin).thenReturn(false);
            secCtx.when(SecurityContext::isManager).thenReturn(false);
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(hrOperationsDashboardService.buildContext(eq(tenantId), eq(userId), eq(employeeId), eq(true), eq(false)))
                    .thenReturn(context);
            when(hrOperationsDashboardService.getDashboardAnalytics(context)).thenReturn(response);

            mockMvc.perform(get("/api/v1/dashboards/hr-operations"))
                    .andExpect(status().isOk());

            verify(hrOperationsDashboardService).getDashboardAnalytics(context);
        }
    }

    @Test
    @DisplayName("Should return manager dashboard for current user")
    void shouldReturnManagerDashboard() throws Exception {
        ManagerDashboardResponse response = new ManagerDashboardResponse();
        when(managerDashboardService.getManagerDashboard()).thenReturn(response);

        mockMvc.perform(get("/api/v1/dashboards/manager"))
                .andExpect(status().isOk());

        verify(managerDashboardService).getManagerDashboard();
    }

    @Test
    @DisplayName("Should return manager dashboard by specific manager ID")
    void shouldReturnManagerDashboardById() throws Exception {
        UUID managerId = UUID.randomUUID();
        ManagerDashboardResponse response = new ManagerDashboardResponse();
        when(managerDashboardService.getManagerDashboard(managerId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/dashboards/manager/{managerId}", managerId))
                .andExpect(status().isOk());

        verify(managerDashboardService).getManagerDashboard(managerId);
    }

    @Test
    @DisplayName("Should return team project allocations")
    void shouldReturnTeamProjects() throws Exception {
        TeamProjectsResponse response = new TeamProjectsResponse();
        when(managerDashboardService.getTeamProjects()).thenReturn(response);

        mockMvc.perform(get("/api/v1/dashboards/manager/team-projects"))
                .andExpect(status().isOk());

        verify(managerDashboardService).getTeamProjects();
    }

    @Test
    @DisplayName("Should return employee dashboard for current user")
    void shouldReturnEmployeeDashboard() throws Exception {
        EmployeeDashboardResponse response = new EmployeeDashboardResponse();
        when(employeeDashboardService.getEmployeeDashboard()).thenReturn(response);

        mockMvc.perform(get("/api/v1/dashboards/employee"))
                .andExpect(status().isOk());

        verify(employeeDashboardService).getEmployeeDashboard();
    }

    @Test
    @DisplayName("Should return employee dashboard by specific employee ID")
    void shouldReturnEmployeeDashboardById() throws Exception {
        EmployeeDashboardResponse response = new EmployeeDashboardResponse();
        when(employeeDashboardService.getEmployeeDashboard(employeeId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/dashboards/employee/{employeeId}", employeeId))
                .andExpect(status().isOk());

        verify(employeeDashboardService).getEmployeeDashboard(employeeId);
    }

    @Test
    @DisplayName("Should smart-route my dashboard to executive for super admin")
    void shouldRouteMyDashboardToExecutiveForSuperAdmin() throws Exception {
        ExecutiveDashboardResponse response = new ExecutiveDashboardResponse();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::isSuperAdmin).thenReturn(true);
            secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
            when(executiveDashboardService.getExecutiveDashboard()).thenReturn(response);

            mockMvc.perform(get("/api/v1/dashboards/my"))
                    .andExpect(status().isOk());

            verify(executiveDashboardService).getExecutiveDashboard();
        }
    }

    @Test
    @DisplayName("Should smart-route my dashboard to employee for regular employee")
    void shouldRouteMyDashboardToEmployeeForRegularEmployee() throws Exception {
        EmployeeDashboardResponse response = new EmployeeDashboardResponse();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::isSuperAdmin).thenReturn(false);
            secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
            secCtx.when(SecurityContext::isHRManager).thenReturn(false);
            secCtx.when(SecurityContext::isManager).thenReturn(false);
            when(employeeDashboardService.getEmployeeDashboard()).thenReturn(response);

            mockMvc.perform(get("/api/v1/dashboards/my"))
                    .andExpect(status().isOk());

            verify(employeeDashboardService).getEmployeeDashboard();
        }
    }

    @Test
    @DisplayName("Should return attendance widget data")
    void shouldReturnAttendanceWidget() throws Exception {
        DashboardContext context = mock(DashboardContext.class);
        DashboardAnalyticsResponse dashboardResponse = mock(DashboardAnalyticsResponse.class);
        DashboardAnalyticsResponse.AttendanceAnalytics attendanceAnalytics =
                new DashboardAnalyticsResponse.AttendanceAnalytics();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class);
             MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {

            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            secCtx.when(SecurityContext::isHRManager).thenReturn(true);
            secCtx.when(SecurityContext::isTenantAdmin).thenReturn(false);
            secCtx.when(SecurityContext::isManager).thenReturn(false);

            when(hrOperationsDashboardService.buildContext(any(), any(), any(), anyBoolean(), anyBoolean()))
                    .thenReturn(context);
            when(hrOperationsDashboardService.getDashboardAnalytics(context)).thenReturn(dashboardResponse);
            when(dashboardResponse.getAttendance()).thenReturn(attendanceAnalytics);

            mockMvc.perform(get("/api/v1/dashboards/widgets/attendance"))
                    .andExpect(status().isOk());
        }
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
