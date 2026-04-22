package com.hrms.api.performance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.performance.dto.*;
import com.hrms.application.performance.service.Feedback360Service;
import com.hrms.common.security.*;
import com.hrms.domain.performance.Feedback360Cycle;
import com.hrms.domain.performance.Feedback360Cycle.CycleStatus;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(Feedback360Controller.class)
@ContextConfiguration(classes = {Feedback360Controller.class, Feedback360ControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("Feedback360Controller Tests")
class Feedback360ControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private Feedback360Service feedback360Service;
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

    private UUID tenantId;
    private UUID cycleId;
    private UUID employeeId;
    private Feedback360Cycle cycle;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        cycleId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        cycle = Feedback360Cycle.builder()
                .name("Q1 2026 360 Review")
                .description("Quarterly 360 feedback cycle")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(1))
                .minPeersRequired(3)
                .maxPeersAllowed(8)
                .isAnonymous(true)
                .includeSelfReview(true)
                .includeManagerReview(true)
                .includePeerReview(true)
                .includeUpwardReview(false)
                .build();
        cycle.setId(cycleId);
        cycle.setTenantId(tenantId);
        cycle.setStatus(CycleStatus.DRAFT);
        cycle.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should create feedback 360 cycle successfully")
    void shouldCreateCycle() throws Exception {
        Feedback360CycleRequest request = Feedback360CycleRequest.builder()
                .name("Q1 2026 360 Review")
                .description("Quarterly 360 feedback cycle")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(1))
                .build();

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(feedback360Service.createCycle(any(Feedback360Cycle.class))).thenReturn(cycle);

            mockMvc.perform(post("/api/v1/feedback360/cycles")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Q1 2026 360 Review"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(feedback360Service).createCycle(any(Feedback360Cycle.class));
        }
    }

    @Test
    @DisplayName("Should get all cycles with pagination")
    void shouldGetAllCycles() throws Exception {
        Page<Feedback360Cycle> page = new PageImpl<>(
                List.of(cycle), PageRequest.of(0, 20), 1);

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(feedback360Service.getAllCycles(eq(tenantId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/feedback360/cycles")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].name").value("Q1 2026 360 Review"));

            verify(feedback360Service).getAllCycles(eq(tenantId), any(Pageable.class));
        }
    }

    @Test
    @DisplayName("Should get active cycles")
    void shouldGetActiveCycles() throws Exception {
        cycle.setStatus(CycleStatus.IN_PROGRESS);

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(feedback360Service.getActiveCycles(tenantId)).thenReturn(List.of(cycle));

            mockMvc.perform(get("/api/v1/feedback360/cycles/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(feedback360Service).getActiveCycles(tenantId);
        }
    }

    @Test
    @DisplayName("Should get cycle by ID")
    void shouldGetCycleById() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(feedback360Service.getCycleById(tenantId, cycleId)).thenReturn(Optional.of(cycle));

            mockMvc.perform(get("/api/v1/feedback360/cycles/{id}", cycleId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Q1 2026 360 Review"));

            verify(feedback360Service).getCycleById(tenantId, cycleId);
        }
    }

    @Test
    @DisplayName("Should return 404 when cycle not found")
    void shouldReturn404WhenCycleNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(feedback360Service.getCycleById(tenantId, unknownId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/feedback360/cycles/{id}", unknownId))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    @DisplayName("Should activate cycle")
    void shouldActivateCycle() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            doNothing().when(feedback360Service).activateCycle(tenantId, cycleId);

            mockMvc.perform(post("/api/v1/feedback360/cycles/{id}/activate", cycleId))
                    .andExpect(status().isOk());

            verify(feedback360Service).activateCycle(tenantId, cycleId);
        }
    }

    @Test
    @DisplayName("Should close cycle")
    void shouldCloseCycle() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            doNothing().when(feedback360Service).closeCycle(tenantId, cycleId);

            mockMvc.perform(post("/api/v1/feedback360/cycles/{id}/close", cycleId))
                    .andExpect(status().isOk());

            verify(feedback360Service).closeCycle(tenantId, cycleId);
        }
    }

    @Test
    @DisplayName("Should delete cycle")
    void shouldDeleteCycle() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            doNothing().when(feedback360Service).deleteCycle(tenantId, cycleId);

            mockMvc.perform(delete("/api/v1/feedback360/cycles/{id}", cycleId))
                    .andExpect(status().isNoContent());

            verify(feedback360Service).deleteCycle(tenantId, cycleId);
        }
    }

    @Test
    @DisplayName("Should get dashboard stats")
    void shouldGetDashboard() throws Exception {
        Map<String, Object> stats = Map.of(
                "activeCycles", 2,
                "pendingReviews", 5
        );

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class);
             MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            when(feedback360Service.getDashboardStats(tenantId, employeeId)).thenReturn(stats);

            mockMvc.perform(get("/api/v1/feedback360/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.activeCycles").value(2))
                    .andExpect(jsonPath("$.pendingReviews").value(5));

            verify(feedback360Service).getDashboardStats(tenantId, employeeId);
        }
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
