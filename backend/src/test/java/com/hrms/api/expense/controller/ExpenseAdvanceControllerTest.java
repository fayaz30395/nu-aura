package com.hrms.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.ExpenseAdvanceRequest;
import com.hrms.api.expense.dto.ExpenseAdvanceResponse;
import com.hrms.application.expense.service.ExpenseAdvanceService;
import com.hrms.common.security.*;
import com.hrms.domain.expense.ExpenseAdvance;
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
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExpenseAdvanceController.class)
@ContextConfiguration(classes = {ExpenseAdvanceController.class, ExpenseAdvanceControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExpenseAdvanceController Integration Tests")
class ExpenseAdvanceControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ExpenseAdvanceService advanceService;
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

    private UUID advanceId;
    private UUID employeeId;
    private ExpenseAdvanceResponse advanceResponse;
    private ExpenseAdvanceRequest advanceRequest;

    @BeforeEach
    void setUp() {
        advanceId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        advanceResponse = ExpenseAdvanceResponse.builder()
                .id(advanceId)
                .employeeId(employeeId)
                .employeeName("John Doe")
                .amount(new BigDecimal("10000.00"))
                .currency("INR")
                .purpose("Client site visit")
                .status(ExpenseAdvance.AdvanceStatus.REQUESTED)
                .requestedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        advanceRequest = ExpenseAdvanceRequest.builder()
                .amount(new BigDecimal("10000.00"))
                .currency("INR")
                .purpose("Client site visit")
                .notes("Travel to Mumbai office")
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create expense advance successfully")
    void shouldCreateAdvanceSuccessfully() throws Exception {
        when(advanceService.createAdvance(eq(employeeId), any(ExpenseAdvanceRequest.class)))
                .thenReturn(advanceResponse);

        mockMvc.perform(post("/api/v1/expenses/advances/employees/{employeeId}", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(advanceRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(advanceId.toString()))
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.amount").value(10000.00));

        verify(advanceService).createAdvance(eq(employeeId), any(ExpenseAdvanceRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid advance request - missing amount")
    void shouldReturn400ForMissingAmount() throws Exception {
        ExpenseAdvanceRequest invalid = ExpenseAdvanceRequest.builder()
                .purpose("Client visit")
                .build();

        mockMvc.perform(post("/api/v1/expenses/advances/employees/{employeeId}", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 for invalid advance request - missing purpose")
    void shouldReturn400ForMissingPurpose() throws Exception {
        ExpenseAdvanceRequest invalid = ExpenseAdvanceRequest.builder()
                .amount(new BigDecimal("10000.00"))
                .build();

        mockMvc.perform(post("/api/v1/expenses/advances/employees/{employeeId}", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should approve advance successfully")
    void shouldApproveAdvanceSuccessfully() throws Exception {
        ExpenseAdvanceResponse approved = ExpenseAdvanceResponse.builder()
                .id(advanceId)
                .status(ExpenseAdvance.AdvanceStatus.APPROVED)
                .approvedAt(LocalDateTime.now())
                .build();

        when(advanceService.approveAdvance(advanceId)).thenReturn(approved);

        mockMvc.perform(post("/api/v1/expenses/advances/{advanceId}/approve", advanceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(advanceService).approveAdvance(advanceId);
    }

    @Test
    @DisplayName("Should disburse advance successfully")
    void shouldDisburseAdvanceSuccessfully() throws Exception {
        ExpenseAdvanceResponse disbursed = ExpenseAdvanceResponse.builder()
                .id(advanceId)
                .status(ExpenseAdvance.AdvanceStatus.DISBURSED)
                .disbursedAt(LocalDateTime.now())
                .build();

        when(advanceService.disburseAdvance(advanceId)).thenReturn(disbursed);

        mockMvc.perform(post("/api/v1/expenses/advances/{advanceId}/disburse", advanceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISBURSED"));

        verify(advanceService).disburseAdvance(advanceId);
    }

    @Test
    @DisplayName("Should settle advance with claim ID")
    void shouldSettleAdvanceWithClaimId() throws Exception {
        UUID claimId = UUID.randomUUID();
        ExpenseAdvanceResponse settled = ExpenseAdvanceResponse.builder()
                .id(advanceId)
                .status(ExpenseAdvance.AdvanceStatus.SETTLED)
                .settlementClaimId(claimId)
                .settledAt(LocalDateTime.now())
                .build();

        when(advanceService.settleAdvance(advanceId, claimId)).thenReturn(settled);

        mockMvc.perform(post("/api/v1/expenses/advances/{advanceId}/settle", advanceId)
                        .param("claimId", claimId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SETTLED"))
                .andExpect(jsonPath("$.settlementClaimId").value(claimId.toString()));

        verify(advanceService).settleAdvance(advanceId, claimId);
    }

    @Test
    @DisplayName("Should cancel advance successfully")
    void shouldCancelAdvanceSuccessfully() throws Exception {
        doNothing().when(advanceService).cancelAdvance(advanceId);

        mockMvc.perform(post("/api/v1/expenses/advances/{advanceId}/cancel", advanceId))
                .andExpect(status().isNoContent());

        verify(advanceService).cancelAdvance(advanceId);
    }

    @Test
    @DisplayName("Should get advance by ID")
    void shouldGetAdvanceById() throws Exception {
        when(advanceService.getAdvance(advanceId)).thenReturn(advanceResponse);

        mockMvc.perform(get("/api/v1/expenses/advances/{advanceId}", advanceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(advanceId.toString()))
                .andExpect(jsonPath("$.purpose").value("Client site visit"));

        verify(advanceService).getAdvance(advanceId);
    }

    @Test
    @DisplayName("Should get advances by employee with pagination")
    void shouldGetAdvancesByEmployee() throws Exception {
        Page<ExpenseAdvanceResponse> page = new PageImpl<>(
                Collections.singletonList(advanceResponse),
                PageRequest.of(0, 20),
                1
        );

        when(advanceService.getAdvancesByEmployee(eq(employeeId), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/expenses/advances/employees/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].employeeId").value(employeeId.toString()));

        verify(advanceService).getAdvancesByEmployee(eq(employeeId), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get all advances with pagination")
    void shouldGetAllAdvances() throws Exception {
        Page<ExpenseAdvanceResponse> page = new PageImpl<>(
                Collections.singletonList(advanceResponse),
                PageRequest.of(0, 20),
                1
        );

        when(advanceService.getAllAdvances(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/expenses/advances")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(advanceService).getAllAdvances(any(Pageable.class));
    }
}
