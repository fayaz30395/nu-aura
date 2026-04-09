package com.hrms.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.expense.dto.MileagePolicyRequest;
import com.hrms.api.expense.dto.MileagePolicyResponse;
import com.hrms.application.expense.service.MileagePolicyService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MileagePolicyController.class)
@ContextConfiguration(classes = {MileagePolicyController.class, MileagePolicyControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MileagePolicyController Integration Tests")
class MileagePolicyControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MileagePolicyService mileagePolicyService;
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
    private MileagePolicyResponse policyResponse;
    private MileagePolicyRequest policyRequest;

    @BeforeEach
    void setUp() {
        policyId = UUID.randomUUID();

        policyResponse = MileagePolicyResponse.builder()
                .id(policyId)
                .name("Standard Mileage Policy")
                .ratePerKm(new BigDecimal("8.00"))
                .maxDailyKm(new BigDecimal("200.00"))
                .maxMonthlyKm(new BigDecimal("3000.00"))
                .vehicleRates("{\"CAR\":8.00,\"MOTORCYCLE\":4.00}")
                .isActive(true)
                .effectiveFrom(LocalDate.of(2026, 1, 1))
                .effectiveTo(LocalDate.of(2026, 12, 31))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        policyRequest = new MileagePolicyRequest(
                "Standard Mileage Policy",
                new BigDecimal("8.00"),
                new BigDecimal("200.00"),
                new BigDecimal("3000.00"),
                "{\"CAR\":8.00,\"MOTORCYCLE\":4.00}",
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 12, 31)
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
    @DisplayName("Should create mileage policy successfully")
    void shouldCreatePolicySuccessfully() throws Exception {
        when(mileagePolicyService.createPolicy(any(MileagePolicyRequest.class)))
                .thenReturn(policyResponse);

        mockMvc.perform(post("/api/v1/expenses/mileage/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(policyRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(policyId.toString()))
                .andExpect(jsonPath("$.name").value("Standard Mileage Policy"))
                .andExpect(jsonPath("$.ratePerKm").value(8.00));

        verify(mileagePolicyService).createPolicy(any(MileagePolicyRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid create request - missing name")
    void shouldReturn400ForMissingName() throws Exception {
        MileagePolicyRequest invalid = new MileagePolicyRequest(
                null, new BigDecimal("8.00"), null, null, null, LocalDate.now(), null);

        mockMvc.perform(post("/api/v1/expenses/mileage/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 for invalid create request - missing rate")
    void shouldReturn400ForMissingRate() throws Exception {
        MileagePolicyRequest invalid = new MileagePolicyRequest(
                "Test Policy", null, null, null, null, LocalDate.now(), null);

        mockMvc.perform(post("/api/v1/expenses/mileage/policies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should update mileage policy successfully")
    void shouldUpdatePolicySuccessfully() throws Exception {
        MileagePolicyResponse updated = policyResponse.toBuilder()
                .name("Updated Mileage Policy")
                .ratePerKm(new BigDecimal("10.00"))
                .build();

        when(mileagePolicyService.updatePolicy(eq(policyId), any(MileagePolicyRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/expenses/mileage/policies/{policyId}", policyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(policyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Mileage Policy"))
                .andExpect(jsonPath("$.ratePerKm").value(10.00));

        verify(mileagePolicyService).updatePolicy(eq(policyId), any(MileagePolicyRequest.class));
    }

    @Test
    @DisplayName("Should toggle mileage policy active status")
    void shouldTogglePolicyActiveStatus() throws Exception {
        doNothing().when(mileagePolicyService).togglePolicy(policyId, false);

        mockMvc.perform(patch("/api/v1/expenses/mileage/policies/{policyId}/toggle", policyId)
                        .param("active", "false"))
                .andExpect(status().isNoContent());

        verify(mileagePolicyService).togglePolicy(policyId, false);
    }

    @Test
    @DisplayName("Should get active mileage policies")
    void shouldGetActivePolicies() throws Exception {
        when(mileagePolicyService.getActivePolicies())
                .thenReturn(Collections.singletonList(policyResponse));

        mockMvc.perform(get("/api/v1/expenses/mileage/policies/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Standard Mileage Policy"));

        verify(mileagePolicyService).getActivePolicies();
    }

    @Test
    @DisplayName("Should get mileage policy by ID")
    void shouldGetPolicyById() throws Exception {
        when(mileagePolicyService.getPolicy(policyId)).thenReturn(policyResponse);

        mockMvc.perform(get("/api/v1/expenses/mileage/policies/{policyId}", policyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(policyId.toString()))
                .andExpect(jsonPath("$.name").value("Standard Mileage Policy"))
                .andExpect(jsonPath("$.maxDailyKm").value(200.00));

        verify(mileagePolicyService).getPolicy(policyId);
    }

    @Test
    @DisplayName("Should delete mileage policy successfully")
    void shouldDeletePolicySuccessfully() throws Exception {
        doNothing().when(mileagePolicyService).deletePolicy(policyId);

        mockMvc.perform(delete("/api/v1/expenses/mileage/policies/{policyId}", policyId))
                .andExpect(status().isNoContent());

        verify(mileagePolicyService).deletePolicy(policyId);
    }

    @Test
    @DisplayName("Should return empty list when no active policies")
    void shouldReturnEmptyListWhenNoActivePolicies() throws Exception {
        when(mileagePolicyService.getActivePolicies()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/expenses/mileage/policies/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(mileagePolicyService).getActivePolicies();
    }
}
