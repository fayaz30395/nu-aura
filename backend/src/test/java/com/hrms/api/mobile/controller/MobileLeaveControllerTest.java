package com.hrms.api.mobile.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.mobile.dto.MobileLeaveDto;
import com.hrms.application.mobile.service.MobileLeaveService;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.empty;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MobileLeaveController.class)
@ContextConfiguration(classes = {MobileLeaveController.class, MobileLeaveControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MobileLeaveController Integration Tests")
class MobileLeaveControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MobileLeaveService mobileLeaveService;
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

    private UUID leaveTypeId;
    private UUID leaveRequestId;

    @BeforeEach
    void setUp() {
        leaveTypeId = UUID.randomUUID();
        leaveRequestId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Quick Apply Leave Tests")
    class QuickApplyLeaveTests {

        @Test
        @DisplayName("Should quick apply leave successfully")
        void shouldQuickApplyLeaveSuccessfully() throws Exception {
            MobileLeaveDto.QuickLeaveRequest request = MobileLeaveDto.QuickLeaveRequest.builder()
                    .leaveTypeId(leaveTypeId)
                    .startDate(LocalDate.now().plusDays(1))
                    .endDate(LocalDate.now().plusDays(2))
                    .reason("Family event")
                    .build();

            MobileLeaveDto.RecentLeaveRequest response = MobileLeaveDto.RecentLeaveRequest.builder()
                    .leaveRequestId(leaveRequestId)
                    .leaveTypeId(leaveTypeId)
                    .leaveTypeName("Casual Leave")
                    .startDate(LocalDate.now().plusDays(1))
                    .endDate(LocalDate.now().plusDays(2))
                    .numberOfDays(2)
                    .status("PENDING")
                    .reason("Family event")
                    .submittedAt(LocalDateTime.now())
                    .build();

            when(mobileLeaveService.quickApplyLeave(any(MobileLeaveDto.QuickLeaveRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/leave/quick-apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.leaveRequestId").value(leaveRequestId.toString()))
                    .andExpect(jsonPath("$.status").value("PENDING"))
                    .andExpect(jsonPath("$.numberOfDays").value(2));

            verify(mobileLeaveService).quickApplyLeave(any(MobileLeaveDto.QuickLeaveRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for missing required fields")
        void shouldReturn400ForMissingRequiredFields() throws Exception {
            MobileLeaveDto.QuickLeaveRequest request = MobileLeaveDto.QuickLeaveRequest.builder()
                    .leaveTypeId(null)
                    .startDate(null)
                    .endDate(null)
                    .reason("")
                    .build();

            mockMvc.perform(post("/api/v1/mobile/leave/quick-apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should quick apply half day leave")
        void shouldQuickApplyHalfDayLeave() throws Exception {
            MobileLeaveDto.QuickLeaveRequest request = MobileLeaveDto.QuickLeaveRequest.builder()
                    .leaveTypeId(leaveTypeId)
                    .startDate(LocalDate.now().plusDays(1))
                    .endDate(LocalDate.now().plusDays(1))
                    .halfDayPeriod("FIRST_HALF")
                    .reason("Doctor appointment")
                    .build();

            MobileLeaveDto.RecentLeaveRequest response = MobileLeaveDto.RecentLeaveRequest.builder()
                    .leaveRequestId(leaveRequestId)
                    .leaveTypeId(leaveTypeId)
                    .numberOfDays(1)
                    .status("PENDING")
                    .build();

            when(mobileLeaveService.quickApplyLeave(any(MobileLeaveDto.QuickLeaveRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/mobile/leave/quick-apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("PENDING"));
        }
    }

    @Nested
    @DisplayName("Get Leave Balance Tests")
    class GetLeaveBalanceTests {

        @Test
        @DisplayName("Should return leave balance successfully")
        void shouldReturnLeaveBalanceSuccessfully() throws Exception {
            MobileLeaveDto.LeaveBalanceResponse response = MobileLeaveDto.LeaveBalanceResponse.builder()
                    .employeeId(UUID.randomUUID())
                    .employeeName("Jane Smith")
                    .casualLeave(MobileLeaveDto.LeaveBalanceResponse.LeaveTypeBalance.builder()
                            .leaveTypeId(leaveTypeId)
                            .leaveTypeName("Casual Leave")
                            .totalBalance(12.0)
                            .usedBalance(4.0)
                            .pendingBalance(1.0)
                            .availableBalance(7.0)
                            .maxConsecutiveDays(3)
                            .build())
                    .build();

            when(mobileLeaveService.getLeaveBalance()).thenReturn(response);

            mockMvc.perform(get("/api/v1/mobile/leave/balance"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeName").value("Jane Smith"))
                    .andExpect(jsonPath("$.casualLeave.totalBalance").value(12.0))
                    .andExpect(jsonPath("$.casualLeave.availableBalance").value(7.0));

            verify(mobileLeaveService).getLeaveBalance();
        }
    }

    @Nested
    @DisplayName("Get Recent Leave Requests Tests")
    class GetRecentLeaveRequestsTests {

        @Test
        @DisplayName("Should return recent leave requests successfully")
        void shouldReturnRecentLeaveRequestsSuccessfully() throws Exception {
            List<MobileLeaveDto.RecentLeaveRequest> requests = List.of(
                    MobileLeaveDto.RecentLeaveRequest.builder()
                            .leaveRequestId(leaveRequestId)
                            .leaveTypeName("Casual Leave")
                            .startDate(LocalDate.now().minusDays(5))
                            .endDate(LocalDate.now().minusDays(4))
                            .numberOfDays(2)
                            .status("APPROVED")
                            .build(),
                    MobileLeaveDto.RecentLeaveRequest.builder()
                            .leaveRequestId(UUID.randomUUID())
                            .leaveTypeName("Sick Leave")
                            .startDate(LocalDate.now().plusDays(3))
                            .endDate(LocalDate.now().plusDays(3))
                            .numberOfDays(1)
                            .status("PENDING")
                            .build()
            );

            when(mobileLeaveService.getRecentLeaveRequests()).thenReturn(requests);

            mockMvc.perform(get("/api/v1/mobile/leave/recent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].status").value("APPROVED"))
                    .andExpect(jsonPath("$[1].status").value("PENDING"));

            verify(mobileLeaveService).getRecentLeaveRequests();
        }

        @Test
        @DisplayName("Should return empty list when no recent requests")
        void shouldReturnEmptyListWhenNoRecentRequests() throws Exception {
            when(mobileLeaveService.getRecentLeaveRequests()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/mobile/leave/recent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("Cancel Leave Request Tests")
    class CancelLeaveRequestTests {

        @Test
        @DisplayName("Should cancel leave request successfully")
        void shouldCancelLeaveRequestSuccessfully() throws Exception {
            MobileLeaveDto.CancelLeaveRequest request = MobileLeaveDto.CancelLeaveRequest.builder()
                    .reason("Plans changed")
                    .build();

            doNothing().when(mobileLeaveService).cancelLeaveRequest(eq(leaveRequestId), any(MobileLeaveDto.CancelLeaveRequest.class));

            mockMvc.perform(delete("/api/v1/mobile/leave/{id}/cancel", leaveRequestId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(mobileLeaveService).cancelLeaveRequest(eq(leaveRequestId), any(MobileLeaveDto.CancelLeaveRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when cancel reason is blank")
        void shouldReturn400WhenCancelReasonIsBlank() throws Exception {
            MobileLeaveDto.CancelLeaveRequest request = MobileLeaveDto.CancelLeaveRequest.builder()
                    .reason("")
                    .build();

            mockMvc.perform(delete("/api/v1/mobile/leave/{id}/cancel", leaveRequestId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
