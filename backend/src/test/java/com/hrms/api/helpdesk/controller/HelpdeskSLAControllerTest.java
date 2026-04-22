package com.hrms.api.helpdesk.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.helpdesk.service.HelpdeskSLAService;
import com.hrms.common.security.*;
import com.hrms.domain.helpdesk.*;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationLevel;
import com.hrms.domain.helpdesk.TicketEscalation.EscalationReason;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HelpdeskSLAController.class)
@ContextConfiguration(classes = {HelpdeskSLAController.class, HelpdeskSLAControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("HelpdeskSLAController Integration Tests")
class HelpdeskSLAControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private HelpdeskSLAService slaService;
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
    private UUID slaId;
    private UUID ticketId;
    private UUID userId;
    private TicketSLA ticketSLA;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        slaId = UUID.randomUUID();
        ticketId = UUID.randomUUID();
        userId = UUID.randomUUID();

        ticketSLA = new TicketSLA();
        ticketSLA.setId(slaId);
        ticketSLA.setTenantId(tenantId);
        ticketSLA.setName("Critical SLA");
        ticketSLA.setDescription("SLA for critical tickets");
        ticketSLA.setFirstResponseMinutes(30);
        ticketSLA.setResolutionMinutes(240);
        ticketSLA.setIsActive(true);
        ticketSLA.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should create SLA policy successfully")
    void shouldCreateSLASuccessfully() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(slaService.createSLA(any(TicketSLA.class))).thenReturn(ticketSLA);

            mockMvc.perform(post("/api/v1/helpdesk/sla")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(ticketSLA)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Critical SLA"))
                    .andExpect(jsonPath("$.firstResponseMinutes").value(30));

            verify(slaService).createSLA(any(TicketSLA.class));
        }
    }

    @Test
    @DisplayName("Should get all SLAs with pagination")
    void shouldGetAllSLAs() throws Exception {
        Page<TicketSLA> page = new PageImpl<>(
                Collections.singletonList(ticketSLA),
                PageRequest.of(0, 20),
                1
        );

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(slaService.getAllSLAs(eq(tenantId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/helpdesk/sla"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(slaService).getAllSLAs(eq(tenantId), any(Pageable.class));
        }
    }

    @Test
    @DisplayName("Should get active SLAs")
    void shouldGetActiveSLAs() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(slaService.getActiveSLAs(tenantId)).thenReturn(List.of(ticketSLA));

            mockMvc.perform(get("/api/v1/helpdesk/sla/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].name").value("Critical SLA"));

            verify(slaService).getActiveSLAs(tenantId);
        }
    }

    @Test
    @DisplayName("Should get SLA by ID")
    void shouldGetSLAById() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(slaService.getSLAById(tenantId, slaId)).thenReturn(Optional.of(ticketSLA));

            mockMvc.perform(get("/api/v1/helpdesk/sla/{id}", slaId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Critical SLA"));

            verify(slaService).getSLAById(tenantId, slaId);
        }
    }

    @Test
    @DisplayName("Should return 404 when SLA not found")
    void shouldReturn404WhenSLANotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(slaService.getSLAById(tenantId, unknownId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/helpdesk/sla/{id}", unknownId))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    @DisplayName("Should delete SLA successfully")
    void shouldDeleteSLASuccessfully() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            doNothing().when(slaService).deleteSLA(tenantId, slaId);

            mockMvc.perform(delete("/api/v1/helpdesk/sla/{id}", slaId))
                    .andExpect(status().isNoContent());

            verify(slaService).deleteSLA(tenantId, slaId);
        }
    }

    @Test
    @DisplayName("Should get ticket escalations")
    void shouldGetTicketEscalations() throws Exception {
        when(slaService.getEscalationsForTicket(ticketId)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/helpdesk/sla/escalations/ticket/{ticketId}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(slaService).getEscalationsForTicket(ticketId);
    }

    @Test
    @DisplayName("Should get SLA dashboard")
    void shouldGetSLADashboard() throws Exception {
        Map<String, Object> dashboard = Map.of(
                "totalSLAs", 5,
                "slaBreaches", 2,
                "avgResponseTime", 25
        );

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(slaService.getSLADashboard(tenantId)).thenReturn(dashboard);

            mockMvc.perform(get("/api/v1/helpdesk/sla/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalSLAs").value(5))
                    .andExpect(jsonPath("$.slaBreaches").value(2));

            verify(slaService).getSLADashboard(tenantId);
        }
    }

    @Test
    @DisplayName("Should submit CSAT rating")
    void shouldSubmitCSATRating() throws Exception {
        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            doNothing().when(slaService).recordCSAT(eq(tenantId), eq(ticketId), eq(5), anyString());

            mockMvc.perform(post("/api/v1/helpdesk/sla/metrics/{ticketId}/csat", ticketId)
                            .param("rating", "5")
                            .param("feedback", "Excellent support"))
                    .andExpect(status().isOk());

            verify(slaService).recordCSAT(eq(tenantId), eq(ticketId), eq(5), eq("Excellent support"));
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
