package com.hrms.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.ExpensePolicyRequest;
import com.hrms.api.expense.dto.ExpensePolicyResponse;
import com.hrms.application.expense.service.ExpensePolicyService;
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

@WebMvcTest(ExpensePolicyController.class)
@ContextConfiguration(classes = {ExpensePolicyController.class, ExpensePolicyControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExpensePolicyController Integration Tests")
class ExpensePolicyControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ExpensePolicyService policyService;
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

    private UUID policyId;
    private ExpensePolicyResponse policyResponse;
    private ExpensePolicyRequest policyRequest;

    @BeforeEach
    void setUp() {
        policyId = UUID.randomUUID();

        policyResponse = ExpensePolicyResponse.builder()
                .id(policyId)
                .name("Standard Travel Policy")
                .description("Default travel expense policy")
                .dailyLimit(new BigDecimal("5000.00"))
                .monthlyLimit(new BigDecimal("50000.00"))
                .yearlyLimit(new BigDecimal("500000.00"))
                .singleClaimLimit(new BigDecimal("25000.00"))
                .requiresPreApproval(true)
                .preApprovalThreshold(new BigDecimal("10000.00"))
                .receiptRequiredAbove(new BigDecimal("500.00"))
                .isActive(true)
                .currency("INR")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        policyRequest = ExpensePolicyRequest.builder()
                .name("Standard Travel Policy")
                .description("Default travel expense policy")
                .dailyLimit(new BigDecimal("5000.00"))
                .monthlyLimit(new BigDecimal("50000.00"))
                .yearlyLimit(new BigDecimal("500000.00"))
                .singleClaimLimit(new BigDecimal("25000.00"))
                .requiresPreApproval(true)
                .preApprovalThreshold(new BigDecimal("10000.00"))
                .receiptRequiredAbove(new BigDecimal("500.00"))
                .currency("INR")
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
    @DisplayName("Should create expense policy successfully")
    void shouldCreatePolicySuccessfully() throws Exception {
        when(policyService.createPolicy(any(ExpensePolicyRequest.class)))
                .thenReturn(policyResponse);

        mockMvc.perform(post("/api/v1/expenses/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(policyRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(policyId.toString()))
                .andExpect(jsonPath("$.name").value("Standard Travel Policy"))
                .andExpect(jsonPath("$.currency").value("INR"));

        verify(policyService).createPolicy(any(ExpensePolicyRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid create request - missing name")
    void shouldReturn400ForMissingName() throws Exception {
        ExpensePolicyRequest invalid = new ExpensePolicyRequest();

        mockMvc.perform(post("/api/v1/expenses/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should update expense policy successfully")
    void shouldUpdatePolicySuccessfully() throws Exception {
        ExpensePolicyResponse updated = ExpensePolicyResponse.builder()
                .id(policyId)
                .name("Updated Travel Policy")
                .dailyLimit(new BigDecimal("8000.00"))
                .build();

        when(policyService.updatePolicy(eq(policyId), any(ExpensePolicyRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/expenses/policies/{policyId}", policyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(policyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Travel Policy"));

        verify(policyService).updatePolicy(eq(policyId), any(ExpensePolicyRequest.class));
    }

    @Test
    @DisplayName("Should get policy by ID")
    void shouldGetPolicyById() throws Exception {
        when(policyService.getPolicy(policyId)).thenReturn(policyResponse);

        mockMvc.perform(get("/api/v1/expenses/policies/{policyId}", policyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(policyId.toString()))
                .andExpect(jsonPath("$.name").value("Standard Travel Policy"));

        verify(policyService).getPolicy(policyId);
    }

    @Test
    @DisplayName("Should get active policies")
    void shouldGetActivePolicies() throws Exception {
        when(policyService.getActivePolicies())
                .thenReturn(Collections.singletonList(policyResponse));

        mockMvc.perform(get("/api/v1/expenses/policies/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Standard Travel Policy"));

        verify(policyService).getActivePolicies();
    }

    @Test
    @DisplayName("Should get all policies with pagination")
    void shouldGetAllPoliciesWithPagination() throws Exception {
        Page<ExpensePolicyResponse> page = new PageImpl<>(
                Collections.singletonList(policyResponse),
                PageRequest.of(0, 20),
                1
        );

        when(policyService.getAllPolicies(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/expenses/policies")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(policyService).getAllPolicies(any(Pageable.class));
    }

    @Test
    @DisplayName("Should toggle policy active status")
    void shouldTogglePolicyActiveStatus() throws Exception {
        doNothing().when(policyService).togglePolicyActive(policyId, false);

        mockMvc.perform(patch("/api/v1/expenses/policies/{policyId}/toggle", policyId)
                        .param("active", "false"))
                .andExpect(status().isNoContent());

        verify(policyService).togglePolicyActive(policyId, false);
    }

    @Test
    @DisplayName("Should delete policy successfully")
    void shouldDeletePolicySuccessfully() throws Exception {
        doNothing().when(policyService).deletePolicy(policyId);

        mockMvc.perform(delete("/api/v1/expenses/policies/{policyId}", policyId))
                .andExpect(status().isNoContent());

        verify(policyService).deletePolicy(policyId);
    }

    @Test
    @DisplayName("Should validate claim amount against policies")
    void shouldValidateClaimAmount() throws Exception {
        UUID employeeId = UUID.randomUUID();
        List<String> violations = List.of("Exceeds daily limit");

        when(policyService.validateClaimAgainstPolicies(eq(employeeId), any(BigDecimal.class)))
                .thenReturn(violations);

        mockMvc.perform(get("/api/v1/expenses/policies/validate")
                        .param("employeeId", employeeId.toString())
                        .param("amount", "60000.00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0]").value("Exceeds daily limit"));

        verify(policyService).validateClaimAgainstPolicies(eq(employeeId), any(BigDecimal.class));
    }

    @Test
    @DisplayName("Should validate claim amount with no violations")
    void shouldValidateClaimAmountNoViolations() throws Exception {
        UUID employeeId = UUID.randomUUID();

        when(policyService.validateClaimAgainstPolicies(eq(employeeId), any(BigDecimal.class)))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/expenses/policies/validate")
                        .param("employeeId", employeeId.toString())
                        .param("amount", "100.00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(policyService).validateClaimAgainstPolicies(eq(employeeId), any(BigDecimal.class));
    }
}
