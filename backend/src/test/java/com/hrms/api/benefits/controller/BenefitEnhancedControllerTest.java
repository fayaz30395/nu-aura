package com.hrms.api.benefits.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.benefits.dto.*;
import com.hrms.application.benefits.service.BenefitEnhancedService;
import com.hrms.common.security.*;
import com.hrms.domain.benefits.BenefitPlanEnhanced;
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

@WebMvcTest(BenefitEnhancedController.class)
@ContextConfiguration(classes = {BenefitEnhancedController.class, BenefitEnhancedControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("BenefitEnhancedController Integration Tests")
class BenefitEnhancedControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private BenefitEnhancedService benefitService;
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

    private UUID planId;
    private UUID employeeId;
    private BenefitPlanEnhancedResponse planResponse;

    @BeforeEach
    void setUp() {
        planId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        planResponse = BenefitPlanEnhancedResponse.builder()
                .id(planId)
                .name("Health Premium Plan")
                .planType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE)
                .category(BenefitPlanEnhanced.PlanCategory.HEALTH)
                .coverageAmount(new BigDecimal("500000"))
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create benefit plan successfully")
    void shouldCreatePlanSuccessfully() throws Exception {
        BenefitPlanEnhancedRequest request = new BenefitPlanEnhancedRequest();
        request.setName("Health Premium Plan");
        request.setPlanType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE);
        request.setCategory(BenefitPlanEnhanced.PlanCategory.HEALTH);

        when(benefitService.createPlan(any(BenefitPlanEnhancedRequest.class)))
                .thenReturn(planResponse);

        mockMvc.perform(post("/api/v1/benefits-enhanced/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Health Premium Plan"));

        verify(benefitService).createPlan(any(BenefitPlanEnhancedRequest.class));
    }

    @Test
    @DisplayName("Should update benefit plan successfully")
    void shouldUpdatePlanSuccessfully() throws Exception {
        BenefitPlanEnhancedRequest request = new BenefitPlanEnhancedRequest();
        request.setName("Updated Health Plan");
        request.setPlanType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE);
        request.setCategory(BenefitPlanEnhanced.PlanCategory.HEALTH);

        BenefitPlanEnhancedResponse updatedResponse = BenefitPlanEnhancedResponse.builder()
                .id(planId)
                .name("Updated Health Plan")
                .planType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE)
                .category(BenefitPlanEnhanced.PlanCategory.HEALTH)
                .build();

        when(benefitService.updatePlan(eq(planId), any(BenefitPlanEnhancedRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/v1/benefits-enhanced/plans/{planId}", planId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Health Plan"));

        verify(benefitService).updatePlan(eq(planId), any(BenefitPlanEnhancedRequest.class));
    }

    @Test
    @DisplayName("Should get all plans with pagination")
    void shouldGetAllPlansWithPagination() throws Exception {
        Page<BenefitPlanEnhancedResponse> page = new PageImpl<>(
                Collections.singletonList(planResponse),
                PageRequest.of(0, 20),
                1
        );

        when(benefitService.getAllPlans(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/benefits-enhanced/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(benefitService).getAllPlans(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get active plans")
    void shouldGetActivePlans() throws Exception {
        when(benefitService.getActivePlans()).thenReturn(List.of(planResponse));

        mockMvc.perform(get("/api/v1/benefits-enhanced/plans/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].active").value(true));

        verify(benefitService).getActivePlans();
    }

    @Test
    @DisplayName("Should get plans by type")
    void shouldGetPlansByType() throws Exception {
        when(benefitService.getPlansByType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE))
                .thenReturn(List.of(planResponse));

        mockMvc.perform(get("/api/v1/benefits-enhanced/plans/type/{planType}", "HEALTH_INSURANCE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(benefitService).getPlansByType(BenefitPlanEnhanced.PlanType.HEALTH_INSURANCE);
    }

    @Test
    @DisplayName("Should get eligible plans for employee grade")
    void shouldGetEligiblePlans() throws Exception {
        when(benefitService.getEligiblePlansForEmployee("L5")).thenReturn(List.of(planResponse));

        mockMvc.perform(get("/api/v1/benefits-enhanced/plans/eligible")
                        .param("grade", "L5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(benefitService).getEligiblePlansForEmployee("L5");
    }

    @Test
    @DisplayName("Should get employee enrollments")
    void shouldGetEmployeeEnrollments() throws Exception {
        when(benefitService.getEmployeeEnrollments(employeeId)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/benefits-enhanced/enrollments/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(benefitService).getEmployeeEnrollments(employeeId);
    }

    @Test
    @DisplayName("Should get benefits dashboard")
    void shouldGetBenefitsDashboard() throws Exception {
        Map<String, Object> dashboard = Map.of(
                "totalPlans", 10,
                "activeEnrollments", 150,
                "totalClaims", 45
        );

        when(benefitService.getBenefitsDashboard()).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/benefits-enhanced/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPlans").value(10))
                .andExpect(jsonPath("$.activeEnrollments").value(150));

        verify(benefitService).getBenefitsDashboard();
    }

    @Test
    @DisplayName("Should get employee benefits summary")
    void shouldGetEmployeeBenefitsSummary() throws Exception {
        Map<String, Object> summary = Map.of("enrolledPlans", 3, "totalCoverage", 1500000);

        when(benefitService.getEmployeeBenefitsSummary(employeeId)).thenReturn(summary);

        mockMvc.perform(get("/api/v1/benefits-enhanced/summary/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrolledPlans").value(3));

        verify(benefitService).getEmployeeBenefitsSummary(employeeId);
    }

    @Test
    @DisplayName("Should get pending enrollments")
    void shouldGetPendingEnrollments() throws Exception {
        when(benefitService.getPendingEnrollments()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/benefits-enhanced/enrollments/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(benefitService).getPendingEnrollments();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
