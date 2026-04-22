package com.hrms.api.organization.controller;

import com.hrms.api.organization.dto.NineBoxDataResponse;
import com.hrms.api.organization.dto.SuccessionAnalyticsResponse;
import com.hrms.application.organization.service.OrganizationService;
import com.hrms.common.security.*;
import com.hrms.domain.organization.*;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrganizationController.class)
@ContextConfiguration(classes = {OrganizationController.class, OrganizationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OrganizationController Tests")
class OrganizationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private OrganizationService organizationService;
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

    private UUID unitId;
    private UUID planId;

    @BeforeEach
    void setUp() {
        unitId = UUID.randomUUID();
        planId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should get organization unit by ID")
    void shouldGetUnitById() throws Exception {
        OrganizationUnit unit = new OrganizationUnit();
        when(organizationService.getUnitById(unitId)).thenReturn(unit);

        mockMvc.perform(get("/api/v1/organization/units/{id}", unitId))
                .andExpect(status().isOk());

        verify(organizationService).getUnitById(unitId);
    }

    @Test
    @DisplayName("Should get organization chart")
    void shouldGetOrgChart() throws Exception {
        when(organizationService.getOrgChart()).thenReturn(List.of(new OrganizationUnit()));

        mockMvc.perform(get("/api/v1/organization/chart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(organizationService).getOrgChart();
    }

    @Test
    @DisplayName("Should get all active units")
    void shouldGetAllActiveUnits() throws Exception {
        when(organizationService.getAllActiveUnits())
                .thenReturn(List.of(new OrganizationUnit(), new OrganizationUnit()));

        mockMvc.perform(get("/api/v1/organization/units"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @DisplayName("Should get all positions with pagination")
    void shouldGetAllPositions() throws Exception {
        Page<Position> page = new PageImpl<>(
                List.of(new Position()),
                PageRequest.of(0, 20),
                1
        );
        when(organizationService.getAllPositions(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/organization/positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("Should get critical positions")
    void shouldGetCriticalPositions() throws Exception {
        when(organizationService.getCriticalPositions()).thenReturn(List.of(new Position()));

        mockMvc.perform(get("/api/v1/organization/positions/critical"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Should get succession plan by ID")
    void shouldGetSuccessionPlanById() throws Exception {
        SuccessionPlan plan = new SuccessionPlan();
        when(organizationService.getSuccessionPlanById(planId)).thenReturn(plan);

        mockMvc.perform(get("/api/v1/organization/succession-plans/{id}", planId))
                .andExpect(status().isOk());

        verify(organizationService).getSuccessionPlanById(planId);
    }

    @Test
    @DisplayName("Should get active talent pools")
    void shouldGetActiveTalentPools() throws Exception {
        when(organizationService.getActiveTalentPools()).thenReturn(List.of(new TalentPool()));

        mockMvc.perform(get("/api/v1/organization/talent-pools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Should remove candidate from succession plan")
    void shouldRemoveCandidate() throws Exception {
        UUID candidateId = UUID.randomUUID();
        doNothing().when(organizationService).removeCandidate(planId, candidateId);

        mockMvc.perform(delete("/api/v1/organization/succession-plans/{planId}/candidates/{candidateId}",
                        planId, candidateId))
                .andExpect(status().isOk());

        verify(organizationService).removeCandidate(planId, candidateId);
    }

    @Test
    @DisplayName("Should get succession analytics")
    void shouldGetSuccessionAnalytics() throws Exception {
        SuccessionAnalyticsResponse analytics = SuccessionAnalyticsResponse.builder()
                .activePlans(5)
                .highRiskPlans(1)
                .criticalPositions(10)
                .build();
        when(organizationService.getSuccessionAnalytics()).thenReturn(analytics);

        mockMvc.perform(get("/api/v1/organization/analytics"))
                .andExpect(status().isOk());

        verify(organizationService).getSuccessionAnalytics();
    }

    @Test
    @DisplayName("Should get nine-box data")
    void shouldGetNineBoxData() throws Exception {
        NineBoxDataResponse nineBox = NineBoxDataResponse.builder()
                .totalCandidates(20)
                .distribution(Map.of("HIGH_HIGH", 5))
                .build();
        when(organizationService.getNineBoxData()).thenReturn(nineBox);

        mockMvc.perform(get("/api/v1/organization/analytics/nine-box"))
                .andExpect(status().isOk());

        verify(organizationService).getNineBoxData();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
