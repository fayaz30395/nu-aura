package com.hrms.api.mobile.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.mobile.dto.MobileDashboardResponse;
import com.hrms.application.mobile.service.MobileService;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MobileDashboardController.class)
@ContextConfiguration(classes = {MobileDashboardController.class, MobileDashboardControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MobileDashboardController Integration Tests")
class MobileDashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private MobileService mobileService;
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

    private MobileDashboardResponse dashboardResponse;

    @BeforeEach
    void setUp() {
        dashboardResponse = MobileDashboardResponse.builder()
                .employeeId(UUID.randomUUID())
                .employeeName("Jane Smith")
                .designation("Software Engineer")
                .department("Engineering")
                .attendanceStatus("CHECKED_IN")
                .lastCheckInTime(LocalDateTime.now().withHour(9).withMinute(0))
                .todayWorkMinutes(240)
                .todayIsLate(false)
                .pendingApprovalsCount(3)
                .leaveBalance(MobileDashboardResponse.LeaveBalanceSummary.builder()
                        .casualLeaveBalance(8)
                        .sickLeaveBalance(5)
                        .earnedLeaveBalance(12)
                        .totalLeavesTaken(5)
                        .totalLeavesPlanned(2)
                        .build())
                .upcomingHolidays(List.of(
                        MobileDashboardResponse.UpcomingHoliday.builder()
                                .holidayName("Independence Day")
                                .date(LocalDate.now().plusDays(10))
                                .daysFromToday(10)
                                .build()))
                .recentAnnouncements(List.of(
                        MobileDashboardResponse.Announcement.builder()
                                .announcementId(UUID.randomUUID())
                                .title("Office Renovation")
                                .content("Building B renovations begin next week")
                                .publishedAt(LocalDateTime.now().minusDays(1))
                                .build()))
                .reminders(List.of(
                        MobileDashboardResponse.EmployeeReminder.builder()
                                .type("BIRTHDAY")
                                .employeeName("Alice Cooper")
                                .date(LocalDate.now().plusDays(2))
                                .build()))
                .recentPendingApprovals(List.of(
                        MobileDashboardResponse.PendingApprovalSummary.builder()
                                .approvalId(UUID.randomUUID())
                                .type("LEAVE")
                                .requesterName("Bob Martin")
                                .submittedAt(LocalDateTime.now().minusHours(3))
                                .status("PENDING")
                                .build()))
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Get Dashboard Tests")
    class GetDashboardTests {

        @Test
        @DisplayName("Should return full dashboard data successfully")
        void shouldReturnFullDashboardDataSuccessfully() throws Exception {
            when(mobileService.getMobileDashboard()).thenReturn(dashboardResponse);

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeName").value("Jane Smith"))
                    .andExpect(jsonPath("$.designation").value("Software Engineer"))
                    .andExpect(jsonPath("$.department").value("Engineering"))
                    .andExpect(jsonPath("$.attendanceStatus").value("CHECKED_IN"))
                    .andExpect(jsonPath("$.pendingApprovalsCount").value(3));

            verify(mobileService).getMobileDashboard();
        }

        @Test
        @DisplayName("Should include leave balance in dashboard response")
        void shouldIncludeLeaveBalanceInDashboard() throws Exception {
            when(mobileService.getMobileDashboard()).thenReturn(dashboardResponse);

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.leaveBalance.casualLeaveBalance").value(8))
                    .andExpect(jsonPath("$.leaveBalance.sickLeaveBalance").value(5))
                    .andExpect(jsonPath("$.leaveBalance.earnedLeaveBalance").value(12))
                    .andExpect(jsonPath("$.leaveBalance.totalLeavesTaken").value(5));
        }

        @Test
        @DisplayName("Should include upcoming holidays in dashboard response")
        void shouldIncludeUpcomingHolidaysInDashboard() throws Exception {
            when(mobileService.getMobileDashboard()).thenReturn(dashboardResponse);

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.upcomingHolidays", hasSize(1)))
                    .andExpect(jsonPath("$.upcomingHolidays[0].holidayName").value("Independence Day"))
                    .andExpect(jsonPath("$.upcomingHolidays[0].daysFromToday").value(10));
        }

        @Test
        @DisplayName("Should include recent announcements in dashboard response")
        void shouldIncludeRecentAnnouncementsInDashboard() throws Exception {
            when(mobileService.getMobileDashboard()).thenReturn(dashboardResponse);

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.recentAnnouncements", hasSize(1)))
                    .andExpect(jsonPath("$.recentAnnouncements[0].title").value("Office Renovation"));
        }

        @Test
        @DisplayName("Should include employee reminders in dashboard response")
        void shouldIncludeEmployeeRemindersInDashboard() throws Exception {
            when(mobileService.getMobileDashboard()).thenReturn(dashboardResponse);

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.reminders", hasSize(1)))
                    .andExpect(jsonPath("$.reminders[0].type").value("BIRTHDAY"))
                    .andExpect(jsonPath("$.reminders[0].employeeName").value("Alice Cooper"));
        }

        @Test
        @DisplayName("Should include pending approvals summary in dashboard")
        void shouldIncludePendingApprovalsSummary() throws Exception {
            when(mobileService.getMobileDashboard()).thenReturn(dashboardResponse);

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.recentPendingApprovals", hasSize(1)))
                    .andExpect(jsonPath("$.recentPendingApprovals[0].type").value("LEAVE"))
                    .andExpect(jsonPath("$.recentPendingApprovals[0].requesterName").value("Bob Martin"));
        }

        @Test
        @DisplayName("Should handle dashboard with NOT_CHECKED_IN status")
        void shouldHandleDashboardWithNotCheckedInStatus() throws Exception {
            MobileDashboardResponse notCheckedIn = MobileDashboardResponse.builder()
                    .employeeId(UUID.randomUUID())
                    .employeeName("Jane Smith")
                    .attendanceStatus("NOT_CHECKED_IN")
                    .todayWorkMinutes(0)
                    .todayIsLate(false)
                    .pendingApprovalsCount(0)
                    .upcomingHolidays(Collections.emptyList())
                    .recentAnnouncements(Collections.emptyList())
                    .reminders(Collections.emptyList())
                    .recentPendingApprovals(Collections.emptyList())
                    .build();

            when(mobileService.getMobileDashboard()).thenReturn(notCheckedIn);

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.attendanceStatus").value("NOT_CHECKED_IN"))
                    .andExpect(jsonPath("$.todayWorkMinutes").value(0));
        }

        @Test
        @DisplayName("Should handle service exception gracefully")
        void shouldHandleServiceExceptionGracefully() throws Exception {
            when(mobileService.getMobileDashboard()).thenThrow(new RuntimeException("Service unavailable"));

            mockMvc.perform(get("/api/v1/mobile/dashboard"))
                    .andExpect(status().isInternalServerError());
        }
    }
}
