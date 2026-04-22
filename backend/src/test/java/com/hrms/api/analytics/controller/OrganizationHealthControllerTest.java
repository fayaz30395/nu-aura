package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.OrganizationHealthResponse;
import com.hrms.application.analytics.service.OrganizationHealthService;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
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
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrganizationHealthController.class)
@ContextConfiguration(classes = {OrganizationHealthController.class, GlobalExceptionHandler.class, OrganizationHealthControllerTest.TestConfig.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OrganizationHealthController Unit Tests")
class OrganizationHealthControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private OrganizationHealthService organizationHealthService;
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

    @Test
    @DisplayName("Should return organization health successfully")
    void shouldReturnOrganizationHealth() throws Exception {
        UUID tenantId = UUID.randomUUID();
        OrganizationHealthResponse response = new OrganizationHealthResponse();

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(organizationHealthService.getOrganizationHealth(tenantId)).thenReturn(response);

            mockMvc.perform(get("/api/v1/analytics/org-health"))
                    .andExpect(status().isOk());

            verify(organizationHealthService).getOrganizationHealth(tenantId);
        }
    }

    @Test
    @DisplayName("Should call service with correct tenant ID")
    void shouldCallServiceWithCorrectTenantId() throws Exception {
        UUID tenantId = UUID.randomUUID();
        OrganizationHealthResponse response = new OrganizationHealthResponse();

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(organizationHealthService.getOrganizationHealth(tenantId)).thenReturn(response);

            mockMvc.perform(get("/api/v1/analytics/org-health"))
                    .andExpect(status().isOk());

            verify(organizationHealthService, times(1)).getOrganizationHealth(tenantId);
            verifyNoMoreInteractions(organizationHealthService);
        }
    }

    @Test
    @DisplayName("Should propagate service exception")
    void shouldPropagateServiceException() throws Exception {
        UUID tenantId = UUID.randomUUID();

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(organizationHealthService.getOrganizationHealth(tenantId))
                    .thenThrow(new RuntimeException("Service error"));

            mockMvc.perform(get("/api/v1/analytics/org-health"))
                    .andExpect(status().isInternalServerError());
        }
    }

    @Test
    @DisplayName("Should return 200 for valid GET request")
    void shouldReturn200ForValidGetRequest() throws Exception {
        UUID tenantId = UUID.randomUUID();

        try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(organizationHealthService.getOrganizationHealth(tenantId))
                    .thenReturn(new OrganizationHealthResponse());

            mockMvc.perform(get("/api/v1/analytics/org-health"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("Should reject POST method")
    void shouldRejectPostMethod() throws Exception {
        mockMvc.perform(post("/api/v1/analytics/org-health"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("Should reject PUT method")
    void shouldRejectPutMethod() throws Exception {
        mockMvc.perform(put("/api/v1/analytics/org-health"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
