package com.hrms.api.overtime.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.overtime.dto.OvertimeApprovalRequest;
import com.hrms.api.overtime.dto.OvertimeRecordRequest;
import com.hrms.api.overtime.dto.OvertimeRecordResponse;
import com.hrms.application.overtime.service.OvertimeManagementService;
import com.hrms.common.security.*;
import com.hrms.domain.overtime.CompTimeBalance;
import com.hrms.domain.overtime.CompTimeTransaction;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OvertimeManagementController.class)
@ContextConfiguration(classes = {OvertimeManagementController.class, OvertimeManagementControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OvertimeManagementController Integration Tests")
class OvertimeManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private OvertimeManagementService overtimeManagementService;
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

    private UUID recordId;
    private UUID employeeId;
    private OvertimeRecordRequest validRequest;
    private OvertimeRecordResponse recordResponse;

    @BeforeEach
    void setUp() {
        recordId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        validRequest = OvertimeRecordRequest.builder()
                .employeeId(employeeId)
                .overtimeDate(LocalDate.now().minusDays(1))
                .regularHours(new BigDecimal("8.00"))
                .actualHours(new BigDecimal("10.50"))
                .overtimeHours(new BigDecimal("2.50"))
                .overtimeType("WEEKDAY")
                .notes("Sprint deadline")
                .build();

        recordResponse = OvertimeRecordResponse.builder()
                .id(recordId)
                .employeeId(employeeId)
                .employeeName("Alice Johnson")
                .employeeCode("EMP-042")
                .overtimeDate(LocalDate.now().minusDays(1))
                .regularHours(new BigDecimal("8.00"))
                .actualHours(new BigDecimal("10.50"))
                .overtimeHours(new BigDecimal("2.50"))
                .overtimeType("WEEKDAY")
                .multiplier(new BigDecimal("1.50"))
                .effectiveHours(new BigDecimal("3.75"))
                .status("PENDING")
                .notes("Sprint deadline")
                .createdAt(LocalDateTime.now())
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
    @DisplayName("Create Overtime Record Tests")
    class CreateTests {

        @Test
        @DisplayName("Should create overtime record successfully")
        void shouldCreateOvertimeRecord() throws Exception {
            when(overtimeManagementService.createOvertimeRecord(any(OvertimeRecordRequest.class)))
                    .thenReturn(recordResponse);

            mockMvc.perform(post("/api/v1/overtime")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(recordId.toString()))
                    .andExpect(jsonPath("$.employeeName").value("Alice Johnson"))
                    .andExpect(jsonPath("$.overtimeHours").value(2.50))
                    .andExpect(jsonPath("$.status").value("PENDING"));

            verify(overtimeManagementService).createOvertimeRecord(any(OvertimeRecordRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for missing required fields")
        void shouldReturn400ForMissingFields() throws Exception {
            OvertimeRecordRequest invalid = new OvertimeRecordRequest();

            mockMvc.perform(post("/api/v1/overtime")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Approve/Reject Overtime Tests")
    class ApprovalTests {

        @Test
        @DisplayName("Should approve overtime record")
        void shouldApproveOvertimeRecord() throws Exception {
            UUID approverId = UUID.randomUUID();
            OvertimeApprovalRequest approvalRequest = OvertimeApprovalRequest.builder()
                    .action("APPROVE")
                    .build();

            OvertimeRecordResponse approved = OvertimeRecordResponse.builder()
                    .id(recordId)
                    .status("APPROVED")
                    .approvedBy(approverId)
                    .approvedAt(LocalDateTime.now())
                    .build();

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(approverId);

                when(overtimeManagementService.approveOrRejectOvertime(
                        eq(recordId), eq(approverId), any(OvertimeApprovalRequest.class)))
                        .thenReturn(approved);

                mockMvc.perform(post("/api/v1/overtime/{recordId}/approve", recordId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(approvalRequest)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("APPROVED"));
            }
        }

        @Test
        @DisplayName("Should reject overtime record with reason")
        void shouldRejectOvertimeRecord() throws Exception {
            UUID approverId = UUID.randomUUID();
            OvertimeApprovalRequest rejectRequest = OvertimeApprovalRequest.builder()
                    .action("REJECT")
                    .rejectionReason("Not pre-approved")
                    .build();

            OvertimeRecordResponse rejected = OvertimeRecordResponse.builder()
                    .id(recordId)
                    .status("REJECTED")
                    .rejectionReason("Not pre-approved")
                    .build();

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(approverId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(approverId);

                when(overtimeManagementService.approveOrRejectOvertime(
                        eq(recordId), eq(approverId), any(OvertimeApprovalRequest.class)))
                        .thenReturn(rejected);

                mockMvc.perform(post("/api/v1/overtime/{recordId}/approve", recordId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(rejectRequest)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("REJECTED"));
            }
        }
    }

    @Nested
    @DisplayName("Overtime Retrieval Tests")
    class RetrievalTests {

        @Test
        @DisplayName("Should get overtime record by ID")
        void shouldGetRecordById() throws Exception {
            when(overtimeManagementService.getOvertimeRecordById(recordId))
                    .thenReturn(recordResponse);

            mockMvc.perform(get("/api/v1/overtime/{recordId}", recordId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(recordId.toString()))
                    .andExpect(jsonPath("$.employeeCode").value("EMP-042"));

            verify(overtimeManagementService).getOvertimeRecordById(recordId);
        }

        @Test
        @DisplayName("Should get employee overtime records with pagination")
        void shouldGetEmployeeRecords() throws Exception {
            Page<OvertimeRecordResponse> page = new PageImpl<>(
                    Collections.singletonList(recordResponse), PageRequest.of(0, 10), 1);

            when(overtimeManagementService.getEmployeeOvertimeRecords(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/overtime/employee/{employeeId}", employeeId)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].employeeId").value(employeeId.toString()));

            verify(overtimeManagementService).getEmployeeOvertimeRecords(eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get pending overtime records")
        void shouldGetPendingRecords() throws Exception {
            Page<OvertimeRecordResponse> page = new PageImpl<>(
                    Collections.singletonList(recordResponse), PageRequest.of(0, 10), 1);

            when(overtimeManagementService.getPendingOvertimeRecords(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/overtime/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(overtimeManagementService).getPendingOvertimeRecords(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get all overtime records with sorting")
        void shouldGetAllRecordsWithSorting() throws Exception {
            Page<OvertimeRecordResponse> page = new PageImpl<>(
                    Collections.singletonList(recordResponse), PageRequest.of(0, 10), 1);

            when(overtimeManagementService.getAllOvertimeRecords(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/overtime")
                            .param("page", "0")
                            .param("size", "10")
                            .param("sortBy", "overtimeDate")
                            .param("sortDirection", "DESC"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(overtimeManagementService).getAllOvertimeRecords(any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Delete and Comp Time Tests")
    class DeleteAndCompTimeTests {

        @Test
        @DisplayName("Should delete overtime record")
        void shouldDeleteRecord() throws Exception {
            doNothing().when(overtimeManagementService).deleteOvertimeRecord(recordId);

            mockMvc.perform(delete("/api/v1/overtime/{recordId}", recordId))
                    .andExpect(status().isNoContent());

            verify(overtimeManagementService).deleteOvertimeRecord(recordId);
        }

        @Test
        @DisplayName("Should get comp time balance for employee")
        void shouldGetCompTimeBalance() throws Exception {
            CompTimeBalance balance = new CompTimeBalance();
            balance.setFiscalYear(2026);
            balance.setCurrentBalance(new BigDecimal("16.00"));
            balance.setTotalAccrued(new BigDecimal("24.00"));
            balance.setTotalUsed(new BigDecimal("8.00"));
            balance.setTotalExpired(BigDecimal.ZERO);

            when(overtimeManagementService.getCompTimeBalance(employeeId)).thenReturn(balance);
            when(overtimeManagementService.getTotalCompTimeBalance(employeeId))
                    .thenReturn(new BigDecimal("16.00"));

            mockMvc.perform(get("/api/v1/overtime/comp-time/balance/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                    .andExpect(jsonPath("$.totalBalance").value(16.00))
                    .andExpect(jsonPath("$.fiscalYear").value(2026))
                    .andExpect(jsonPath("$.totalAccrued").value(24.00));

            verify(overtimeManagementService).getCompTimeBalance(employeeId);
            verify(overtimeManagementService).getTotalCompTimeBalance(employeeId);
        }

        @Test
        @DisplayName("Should accrue comp time hours")
        void shouldAccrueCompTime() throws Exception {
            doNothing().when(overtimeManagementService)
                    .accrueCompTime(eq(employeeId), any(BigDecimal.class), any(), any(LocalDate.class));

            mockMvc.perform(post("/api/v1/overtime/comp-time/accrue")
                            .param("employeeId", employeeId.toString())
                            .param("hours", "4.00")
                            .param("overtimeDate", LocalDate.now().toString()))
                    .andExpect(status().isOk());

            verify(overtimeManagementService).accrueCompTime(
                    eq(employeeId), any(BigDecimal.class), any(), any(LocalDate.class));
        }

        @Test
        @DisplayName("Should use comp time hours")
        void shouldUseCompTime() throws Exception {
            doNothing().when(overtimeManagementService)
                    .useCompTime(eq(employeeId), any(BigDecimal.class), any(), any(LocalDate.class));

            mockMvc.perform(post("/api/v1/overtime/comp-time/use")
                            .param("employeeId", employeeId.toString())
                            .param("hours", "4.00")
                            .param("usageDate", LocalDate.now().toString()))
                    .andExpect(status().isOk());

            verify(overtimeManagementService).useCompTime(
                    eq(employeeId), any(BigDecimal.class), any(), any(LocalDate.class));
        }
    }
}
