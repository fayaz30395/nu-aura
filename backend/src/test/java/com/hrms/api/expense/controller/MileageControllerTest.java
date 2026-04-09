package com.hrms.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.MileageLogRequest;
import com.hrms.api.expense.dto.MileageLogResponse;
import com.hrms.api.expense.dto.MileageSummaryResponse;
import com.hrms.application.expense.service.MileageService;
import com.hrms.common.security.*;
import com.hrms.domain.expense.MileageLog;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
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

@WebMvcTest(MileageController.class)
@ContextConfiguration(classes = {MileageController.class, MileageControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MileageController Integration Tests")
class MileageControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MileageService mileageService;
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

    private UUID logId;
    private UUID employeeId;
    private MileageLogResponse logResponse;
    private MileageLogRequest logRequest;

    @BeforeEach
    void setUp() {
        logId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        logResponse = MileageLogResponse.builder()
                .id(logId)
                .employeeId(employeeId)
                .employeeName("John Doe")
                .travelDate(LocalDate.now())
                .fromLocation("Office A")
                .toLocation("Client Site B")
                .distanceKm(new BigDecimal("45.50"))
                .purpose("Client meeting")
                .vehicleType(MileageLog.VehicleType.CAR)
                .ratePerKm(new BigDecimal("8.00"))
                .reimbursementAmount(new BigDecimal("364.00"))
                .status(MileageLog.MileageStatus.DRAFT)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        logRequest = new MileageLogRequest(
                LocalDate.now(),
                "Office A",
                "Client Site B",
                new BigDecimal("45.50"),
                "Client meeting",
                MileageLog.VehicleType.CAR,
                "Regular commute"
        );
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create mileage log successfully")
    void shouldCreateMileageLogSuccessfully() throws Exception {
        when(mileageService.createMileageLog(eq(employeeId), any(MileageLogRequest.class)))
                .thenReturn(logResponse);

        mockMvc.perform(post("/api/v1/expenses/mileage/employees/{employeeId}", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(logId.toString()))
                .andExpect(jsonPath("$.fromLocation").value("Office A"))
                .andExpect(jsonPath("$.toLocation").value("Client Site B"))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(mileageService).createMileageLog(eq(employeeId), any(MileageLogRequest.class));
    }

    @Test
    @DisplayName("Should update mileage log successfully")
    void shouldUpdateMileageLogSuccessfully() throws Exception {
        MileageLogResponse updated = logResponse.toBuilder()
                .distanceKm(new BigDecimal("55.00"))
                .reimbursementAmount(new BigDecimal("440.00"))
                .build();

        when(mileageService.updateMileageLog(eq(logId), any(MileageLogRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/expenses/mileage/{logId}", logId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(logRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.distanceKm").value(55.00));

        verify(mileageService).updateMileageLog(eq(logId), any(MileageLogRequest.class));
    }

    @Test
    @DisplayName("Should submit mileage log successfully")
    void shouldSubmitMileageLogSuccessfully() throws Exception {
        MileageLogResponse submitted = logResponse.toBuilder()
                .status(MileageLog.MileageStatus.SUBMITTED)
                .build();

        when(mileageService.submitMileageLog(logId)).thenReturn(submitted);

        mockMvc.perform(post("/api/v1/expenses/mileage/{logId}/submit", logId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        verify(mileageService).submitMileageLog(logId);
    }

    @Test
    @DisplayName("Should approve mileage log successfully")
    void shouldApproveMileageLogSuccessfully() throws Exception {
        MileageLogResponse approved = logResponse.toBuilder()
                .status(MileageLog.MileageStatus.APPROVED)
                .approvedAt(LocalDateTime.now())
                .build();

        when(mileageService.approveMileageLog(logId)).thenReturn(approved);

        mockMvc.perform(post("/api/v1/expenses/mileage/{logId}/approve", logId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(mileageService).approveMileageLog(logId);
    }

    @Test
    @DisplayName("Should reject mileage log with reason")
    void shouldRejectMileageLogWithReason() throws Exception {
        MileageLogResponse rejected = logResponse.toBuilder()
                .status(MileageLog.MileageStatus.REJECTED)
                .rejectionReason("Distance seems inflated")
                .build();

        when(mileageService.rejectMileageLog(eq(logId), anyString())).thenReturn(rejected);

        mockMvc.perform(post("/api/v1/expenses/mileage/{logId}/reject", logId)
                        .param("reason", "Distance seems inflated"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        verify(mileageService).rejectMileageLog(eq(logId), eq("Distance seems inflated"));
    }

    @Test
    @DisplayName("Should get employee mileage logs with pagination")
    void shouldGetEmployeeMileageLogs() throws Exception {
        Page<MileageLogResponse> page = new PageImpl<>(
                Collections.singletonList(logResponse),
                PageRequest.of(0, 20),
                1
        );

        when(mileageService.getEmployeeMileageLogs(eq(employeeId), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/expenses/mileage/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].employeeId").value(employeeId.toString()));

        verify(mileageService).getEmployeeMileageLogs(eq(employeeId), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get monthly mileage summary")
    void shouldGetMonthlySummary() throws Exception {
        MileageSummaryResponse summary = MileageSummaryResponse.builder()
                .year(2026)
                .month(4)
                .totalDistanceKm(new BigDecimal("350.00"))
                .totalReimbursement(new BigDecimal("2800.00"))
                .totalTrips(8)
                .policyMaxMonthlyKm(new BigDecimal("1000.00"))
                .remainingMonthlyKm(new BigDecimal("650.00"))
                .build();

        when(mileageService.getMonthlySummary(employeeId, 2026, 4)).thenReturn(summary);

        mockMvc.perform(get("/api/v1/expenses/mileage/summary/{employeeId}", employeeId)
                        .param("year", "2026")
                        .param("month", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.month").value(4))
                .andExpect(jsonPath("$.totalTrips").value(8))
                .andExpect(jsonPath("$.totalDistanceKm").value(350.00));

        verify(mileageService).getMonthlySummary(employeeId, 2026, 4);
    }

    @Test
    @DisplayName("Should get pending mileage approvals")
    void shouldGetPendingApprovals() throws Exception {
        MileageLogResponse pending = logResponse.toBuilder()
                .status(MileageLog.MileageStatus.SUBMITTED)
                .build();

        Page<MileageLogResponse> page = new PageImpl<>(
                Collections.singletonList(pending),
                PageRequest.of(0, 20),
                1
        );

        when(mileageService.getPendingApprovals(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/expenses/mileage/pending-approvals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].status").value("SUBMITTED"));

        verify(mileageService).getPendingApprovals(any(Pageable.class));
    }

    @Test
    @DisplayName("Should handle pagination parameters for pending approvals")
    void shouldHandlePaginationForPendingApprovals() throws Exception {
        Page<MileageLogResponse> page = new PageImpl<>(
                Collections.emptyList(), PageRequest.of(2, 10), 25);

        when(mileageService.getPendingApprovals(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/expenses/mileage/pending-approvals")
                        .param("page", "2")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(25));

        verify(mileageService).getPendingApprovals(any(Pageable.class));
    }
}
