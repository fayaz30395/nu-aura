package com.hrms.api.mobile.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.mobile.dto.MobileSyncDto;
import com.hrms.application.mobile.service.MobileSyncService;
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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MobileSyncController.class)
@ContextConfiguration(classes = {MobileSyncController.class, MobileSyncControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MobileSyncController Integration Tests")
class MobileSyncControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MobileSyncService mobileSyncService;
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
    @DisplayName("Delta Sync Tests")
    class DeltaSyncTests {

        @Test
        @DisplayName("Should return delta sync data successfully")
        void shouldReturnDeltaSyncDataSuccessfully() throws Exception {
            LocalDateTime lastSyncAt = LocalDateTime.now().minusHours(1);
            LocalDateTime syncTimestamp = LocalDateTime.now();

            MobileSyncDto.SyncResponse response = MobileSyncDto.SyncResponse.builder()
                    .syncTimestamp(syncTimestamp)
                    .totalChanges(3)
                    .hasMoreChanges(false)
                    .employeeDataChanges(List.of(
                            MobileSyncDto.SyncResponse.EmployeeDataChange.builder()
                                    .employeeId(UUID.randomUUID())
                                    .changeType("UPDATED")
                                    .changedAt(LocalDateTime.now().minusMinutes(30))
                                    .designation("Senior Engineer")
                                    .department("Engineering")
                                    .name("John Doe")
                                    .build()))
                    .leaveBalanceChanges(List.of(
                            MobileSyncDto.SyncResponse.LeaveBalanceChange.builder()
                                    .employeeId(UUID.randomUUID())
                                    .leaveTypeId(UUID.randomUUID())
                                    .leaveTypeName("Casual Leave")
                                    .availableBalance(7.0)
                                    .pendingBalance(1.0)
                                    .changedAt(LocalDateTime.now().minusMinutes(20))
                                    .build()))
                    .approvalChanges(List.of(
                            MobileSyncDto.SyncResponse.ApprovalChange.builder()
                                    .approvalId(UUID.randomUUID())
                                    .type("LEAVE_REQUEST")
                                    .status("APPROVED")
                                    .changedAt(LocalDateTime.now().minusMinutes(10))
                                    .build()))
                    .attendanceRecordChanges(Collections.emptyList())
                    .notificationChanges(Collections.emptyList())
                    .build();

            when(mobileSyncService.deltaSync(any(MobileSyncDto.SyncRequest.class))).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/sync")
                            .param("lastSyncAt", lastSyncAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalChanges").value(3))
                    .andExpect(jsonPath("$.hasMoreChanges").value(false))
                    .andExpect(jsonPath("$.employeeDataChanges", hasSize(1)))
                    .andExpect(jsonPath("$.employeeDataChanges[0].changeType").value("UPDATED"))
                    .andExpect(jsonPath("$.leaveBalanceChanges", hasSize(1)))
                    .andExpect(jsonPath("$.approvalChanges", hasSize(1)));

            verify(mobileSyncService).deltaSync(any(MobileSyncDto.SyncRequest.class));
        }

        @Test
        @DisplayName("Should return sync data with custom limit")
        void shouldReturnSyncDataWithCustomLimit() throws Exception {
            LocalDateTime lastSyncAt = LocalDateTime.now().minusDays(1);

            MobileSyncDto.SyncResponse response = MobileSyncDto.SyncResponse.builder()
                    .syncTimestamp(LocalDateTime.now())
                    .totalChanges(50)
                    .hasMoreChanges(true)
                    .employeeDataChanges(Collections.emptyList())
                    .leaveBalanceChanges(Collections.emptyList())
                    .attendanceRecordChanges(Collections.emptyList())
                    .approvalChanges(Collections.emptyList())
                    .notificationChanges(Collections.emptyList())
                    .build();

            when(mobileSyncService.deltaSync(any(MobileSyncDto.SyncRequest.class))).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/sync")
                            .param("lastSyncAt", lastSyncAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                            .param("limit", "50"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalChanges").value(50))
                    .andExpect(jsonPath("$.hasMoreChanges").value(true));
        }

        @Test
        @DisplayName("Should use default limit when not provided")
        void shouldUseDefaultLimitWhenNotProvided() throws Exception {
            LocalDateTime lastSyncAt = LocalDateTime.now().minusHours(2);

            MobileSyncDto.SyncResponse response = MobileSyncDto.SyncResponse.builder()
                    .syncTimestamp(LocalDateTime.now())
                    .totalChanges(0)
                    .hasMoreChanges(false)
                    .employeeDataChanges(Collections.emptyList())
                    .leaveBalanceChanges(Collections.emptyList())
                    .attendanceRecordChanges(Collections.emptyList())
                    .approvalChanges(Collections.emptyList())
                    .notificationChanges(Collections.emptyList())
                    .build();

            when(mobileSyncService.deltaSync(any(MobileSyncDto.SyncRequest.class))).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/sync")
                            .param("lastSyncAt", lastSyncAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalChanges").value(0));
        }

        @Test
        @DisplayName("Should return 400 when lastSyncAt is missing")
        void shouldReturn400WhenLastSyncAtIsMissing() throws Exception {
            mockMvc.perform(get("/api/v1/mobile/sync"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should include notification changes in sync response")
        void shouldIncludeNotificationChangesInSyncResponse() throws Exception {
            LocalDateTime lastSyncAt = LocalDateTime.now().minusMinutes(30);

            MobileSyncDto.SyncResponse response = MobileSyncDto.SyncResponse.builder()
                    .syncTimestamp(LocalDateTime.now())
                    .totalChanges(2)
                    .hasMoreChanges(false)
                    .employeeDataChanges(Collections.emptyList())
                    .leaveBalanceChanges(Collections.emptyList())
                    .attendanceRecordChanges(Collections.emptyList())
                    .approvalChanges(Collections.emptyList())
                    .notificationChanges(List.of(
                            MobileSyncDto.SyncResponse.NotificationChange.builder()
                                    .notificationId(UUID.randomUUID())
                                    .type("APPROVAL")
                                    .title("Leave Approved")
                                    .message("Your leave request has been approved")
                                    .isRead(false)
                                    .createdAt(LocalDateTime.now().minusMinutes(15))
                                    .build(),
                            MobileSyncDto.SyncResponse.NotificationChange.builder()
                                    .notificationId(UUID.randomUUID())
                                    .type("SYSTEM")
                                    .title("Profile Updated")
                                    .message("Your profile has been updated")
                                    .isRead(true)
                                    .createdAt(LocalDateTime.now().minusMinutes(5))
                                    .build()))
                    .build();

            when(mobileSyncService.deltaSync(any(MobileSyncDto.SyncRequest.class))).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/sync")
                            .param("lastSyncAt", lastSyncAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.notificationChanges", hasSize(2)))
                    .andExpect(jsonPath("$.notificationChanges[0].type").value("APPROVAL"))
                    .andExpect(jsonPath("$.notificationChanges[1].isRead").value(true));
        }

        @Test
        @DisplayName("Should include attendance record changes in sync response")
        void shouldIncludeAttendanceRecordChanges() throws Exception {
            LocalDateTime lastSyncAt = LocalDateTime.now().minusHours(6);

            MobileSyncDto.SyncResponse response = MobileSyncDto.SyncResponse.builder()
                    .syncTimestamp(LocalDateTime.now())
                    .totalChanges(1)
                    .hasMoreChanges(false)
                    .employeeDataChanges(Collections.emptyList())
                    .leaveBalanceChanges(Collections.emptyList())
                    .attendanceRecordChanges(List.of(
                            MobileSyncDto.SyncResponse.AttendanceRecordChange.builder()
                                    .recordId(UUID.randomUUID())
                                    .employeeId(UUID.randomUUID())
                                    .status("CHECKED_IN")
                                    .checkInTime(LocalDateTime.now().withHour(9).withMinute(5))
                                    .workDurationMinutes(0)
                                    .isLate(true)
                                    .changedAt(LocalDateTime.now().withHour(9).withMinute(5))
                                    .build()))
                    .approvalChanges(Collections.emptyList())
                    .notificationChanges(Collections.emptyList())
                    .build();

            when(mobileSyncService.deltaSync(any(MobileSyncDto.SyncRequest.class))).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/sync")
                            .param("lastSyncAt", lastSyncAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.attendanceRecordChanges", hasSize(1)))
                    .andExpect(jsonPath("$.attendanceRecordChanges[0].status").value("CHECKED_IN"))
                    .andExpect(jsonPath("$.attendanceRecordChanges[0].isLate").value(true));
        }
    }
}
