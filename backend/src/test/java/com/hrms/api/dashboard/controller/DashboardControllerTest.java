package com.hrms.api.dashboard.controller;

import com.hrms.api.dashboard.dto.DashboardMetricsResponse;
import com.hrms.application.dashboard.service.DashboardService;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.common.security.SecurityContext;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = DashboardController.class)
@ContextConfiguration(classes = {DashboardController.class, DashboardControllerTest.TestConfig.class})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private DashboardService dashboardService;
    @MockitoBean
    private JwtTokenProvider tokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private EmployeeRepository employeeRepository;
    private DashboardMetricsResponse mockResponse;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        mockResponse = createMockDashboardMetrics();
    }

    @Test
    @WithMockUser(authorities = "DASHBOARD:VIEW")
    void getDashboardMetrics_ShouldReturnMetrics_WhenAuthorized() throws Exception {
        // Given
        when(dashboardService.getDashboardMetrics()).thenReturn(mockResponse);

        try (MockedStatic<SecurityContext> mockedSecurityContext = mockStatic(SecurityContext.class)) {
            mockedSecurityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            // When & Then
            mockMvc.perform(get("/api/v1/dashboard/metrics")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.employeeMetrics").exists())
                    .andExpect(jsonPath("$.employeeMetrics.totalEmployees").value(100))
                    .andExpect(jsonPath("$.employeeMetrics.activeEmployees").value(85))
                    .andExpect(jsonPath("$.attendanceMetrics").exists())
                    .andExpect(jsonPath("$.leaveMetrics").exists())
                    .andExpect(jsonPath("$.departmentMetrics").exists())
                    .andExpect(jsonPath("$.recentActivities").isArray());

            verify(dashboardService, times(1)).getDashboardMetrics();
        }
    }

    private DashboardMetricsResponse createMockDashboardMetrics() {
        // Employee Metrics
        DashboardMetricsResponse.EmployeeMetrics employeeMetrics = DashboardMetricsResponse.EmployeeMetrics.builder()
                .totalEmployees(100L)
                .activeEmployees(85L)
                .inactiveEmployees(15L)
                .newEmployeesThisMonth(5L)
                .employeesByDepartment(Map.of(
                        "Engineering", 40L,
                        "Sales", 30L,
                        "HR", 10L
                ))
                .employeesByStatus(Map.of(
                        "ACTIVE", 85L,
                        "ON_LEAVE", 10L,
                        "TERMINATED", 5L
                ))
                .build();

        // Attendance Metrics
        List<DashboardMetricsResponse.DailyAttendance> dailyAttendance = Arrays.asList(
                DashboardMetricsResponse.DailyAttendance.builder()
                        .date(java.time.LocalDate.now().minusDays(1))
                        .present(80L)
                        .absent(5L)
                        .late(3L)
                        .build()
        );

        DashboardMetricsResponse.AttendanceMetrics attendanceMetrics = DashboardMetricsResponse.AttendanceMetrics.builder()
                .presentToday(80L)
                .absentToday(5L)
                .lateArrivals(3L)
                .earlyDepartures(2L)
                .averageAttendanceRate(94.5)
                .last7Days(dailyAttendance)
                .build();

        // Leave Metrics
        DashboardMetricsResponse.LeaveMetrics leaveMetrics = DashboardMetricsResponse.LeaveMetrics.builder()
                .pendingLeaveRequests(8L)
                .approvedLeavesThisMonth(15L)
                .totalLeavesThisMonth(23L)
                .leavesByType(Map.of(
                        "SICK_LEAVE", 8L,
                        "CASUAL_LEAVE", 12L,
                        "ANNUAL_LEAVE", 3L
                ))
                .upcomingLeaves(new ArrayList<>())
                .build();

        // Department Metrics
        DashboardMetricsResponse.DepartmentMetrics departmentMetrics = DashboardMetricsResponse.DepartmentMetrics.builder()
                .departmentStats(new HashMap<>())
                .build();

        // Recent Activities
        List<DashboardMetricsResponse.RecentActivity> recentActivities = Arrays.asList(
                DashboardMetricsResponse.RecentActivity.builder()
                        .actorName("admin@test.com")
                        .action("CREATE")
                        .entityType("EMPLOYEE")
                        .description("Created new employee")
                        .timestamp("2025-12-01 10:30:00")
                        .build(),
                DashboardMetricsResponse.RecentActivity.builder()
                        .actorName("manager@test.com")
                        .action("UPDATE")
                        .entityType("ROLE")
                        .description("Updated role permissions")
                        .timestamp("2025-12-01 09:15:00")
                        .build()
        );

        return DashboardMetricsResponse.builder()
                .employeeMetrics(employeeMetrics)
                .attendanceMetrics(attendanceMetrics)
                .leaveMetrics(leaveMetrics)
                .departmentMetrics(departmentMetrics)
                .recentActivities(recentActivities)
                .build();
    }

    // Note: Authorization tests (401/403) are covered by integration tests
    // and omitted here due to @WebMvcTest slice testing limitations

    @Configuration
    static class TestConfig {
        @Bean
        public AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
