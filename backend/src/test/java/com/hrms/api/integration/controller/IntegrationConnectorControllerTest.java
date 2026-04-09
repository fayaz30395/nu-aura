package com.hrms.api.integration.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.integration.dto.*;
import com.hrms.application.integration.service.ConnectorRegistry;
import com.hrms.application.integration.service.IntegrationConnectorConfigService;
import com.hrms.application.integration.service.IntegrationEventLogService;
import com.hrms.common.security.*;
import com.hrms.domain.integration.ConnectorCapabilities;
import com.hrms.domain.integration.ConnectorConfig;
import com.hrms.domain.integration.ConnectorStatus;
import com.hrms.domain.integration.ConnectorType;
import com.hrms.domain.integration.ConnectionTestResult;
import com.hrms.domain.integration.IntegrationConnector;
import com.hrms.domain.integration.IntegrationConnectorConfigEntity;
import com.hrms.domain.integration.IntegrationEventLog;
import com.hrms.infrastructure.integration.repository.IntegrationConnectorConfigRepository;
import com.hrms.infrastructure.integration.repository.IntegrationEventLogRepository;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IntegrationConnectorController.class)
@ContextConfiguration(classes = {IntegrationConnectorController.class, IntegrationConnectorControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("IntegrationConnectorController Tests")
class IntegrationConnectorControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ConnectorRegistry connectorRegistry;
    @MockitoBean
    private IntegrationConnectorConfigService configService;
    @MockitoBean
    private IntegrationEventLogService eventLogService;
    @MockitoBean
    private IntegrationConnectorConfigRepository configRepository;
    @MockitoBean
    private IntegrationEventLogRepository eventLogRepository;
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

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("List Connectors Tests")
    class ListConnectorsTests {

        @Test
        @DisplayName("Should list all available connectors")
        void shouldListAllConnectors() throws Exception {
            IntegrationConnector mockConnector = mock(IntegrationConnector.class);
            when(mockConnector.getConnectorId()).thenReturn("slack");
            when(mockConnector.getType()).thenReturn(ConnectorType.NOTIFICATION);
            when(mockConnector.getCapabilities()).thenReturn(mock(ConnectorCapabilities.class));
            when(connectorRegistry.getAllConnectors()).thenReturn(List.of(mockConnector));
            when(configRepository.findByTenantIdAndConnectorIdAndIsDeletedFalse(any(UUID.class), eq("slack")))
                    .thenReturn(Optional.empty());

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/integrations/connectors"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(1)))
                        .andExpect(jsonPath("$[0].connectorId").value("slack"))
                        .andExpect(jsonPath("$[0].status").value("UNCONFIGURED"));
            }
        }

        @Test
        @DisplayName("Should return empty list when no connectors registered")
        void shouldReturnEmptyList() throws Exception {
            when(connectorRegistry.getAllConnectors()).thenReturn(Collections.emptyList());

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/integrations/connectors"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(0)));
            }
        }
    }

    @Nested
    @DisplayName("Get Connector Details Tests")
    class GetConnectorDetailsTests {

        @Test
        @DisplayName("Should get connector details by ID")
        void shouldGetConnectorDetails() throws Exception {
            IntegrationConnector mockConnector = mock(IntegrationConnector.class);
            when(mockConnector.getConnectorId()).thenReturn("docusign");
            when(mockConnector.getType()).thenReturn(ConnectorType.E_SIGNATURE);
            when(mockConnector.getCapabilities()).thenReturn(mock(ConnectorCapabilities.class));
            when(connectorRegistry.getConnector("docusign")).thenReturn(mockConnector);
            when(configRepository.findByTenantIdAndConnectorIdAndIsDeletedFalse(any(UUID.class), eq("docusign")))
                    .thenReturn(Optional.empty());

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/integrations/connectors/docusign"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.connectorId").value("docusign"))
                        .andExpect(jsonPath("$.status").value("UNCONFIGURED"));
            }
        }
    }

    @Nested
    @DisplayName("Save Connector Config Tests")
    class SaveConfigTests {

        @Test
        @DisplayName("Should save connector configuration successfully")
        void shouldSaveConfig() throws Exception {
            ConnectorConfigRequest request = new ConnectorConfigRequest();
            request.setDisplayName("My Slack");
            request.setConfigSettings(Map.of("webhookUrl", "https://hooks.slack.com/test"));
            request.setEventSubscriptions(Set.of("employee.created"));

            IntegrationConnectorConfigEntity entity = mock(IntegrationConnectorConfigEntity.class);
            when(entity.getId()).thenReturn(UUID.randomUUID());
            when(entity.getStatus()).thenReturn(ConnectorStatus.INACTIVE);
            when(entity.getDisplayName()).thenReturn("My Slack");
            when(entity.getEventSubscriptions()).thenReturn("employee.created");
            when(entity.getCreatedAt()).thenReturn(LocalDateTime.now());
            when(entity.getUpdatedAt()).thenReturn(LocalDateTime.now());

            when(connectorRegistry.getConnector("slack")).thenReturn(mock(IntegrationConnector.class));
            when(configService.saveConfig(any(UUID.class), eq("slack"), anyMap(), anySet())).thenReturn(entity);
            when(configRepository.save(any())).thenReturn(entity);

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(put("/api/v1/integrations/connectors/slack/config")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.connectorId").value("slack"))
                        .andExpect(jsonPath("$.status").value("INACTIVE"));
            }
        }
    }

    @Nested
    @DisplayName("Test Connection Tests")
    class TestConnectionTests {

        @Test
        @DisplayName("Should test connection successfully")
        void shouldTestConnectionSuccessfully() throws Exception {
            IntegrationConnector mockConnector = mock(IntegrationConnector.class);
            when(connectorRegistry.getConnector("slack")).thenReturn(mockConnector);
            when(configService.getConfig(any(UUID.class), eq("slack"))).thenReturn(mock(ConnectorConfig.class));
            when(mockConnector.testConnection(any(ConnectorConfig.class)))
                    .thenReturn(new ConnectionTestResult(true, "OK", 50L, Map.of()));

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(post("/api/v1/integrations/connectors/slack/test"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.success").value(true))
                        .andExpect(jsonPath("$.message").value("Connection successful"));
            }
        }

        @Test
        @DisplayName("Should handle connection test failure gracefully")
        void shouldHandleConnectionFailure() throws Exception {
            IntegrationConnector mockConnector = mock(IntegrationConnector.class);
            when(connectorRegistry.getConnector("slack")).thenReturn(mockConnector);
            when(configService.getConfig(any(UUID.class), eq("slack"))).thenReturn(mock(ConnectorConfig.class));
            when(mockConnector.testConnection(any(ConnectorConfig.class)))
                    .thenThrow(new RuntimeException("Connection refused"));

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(post("/api/v1/integrations/connectors/slack/test"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message", containsString("Connection refused")));
            }
        }
    }

    @Nested
    @DisplayName("Activate/Deactivate Connector Tests")
    class ActivateDeactivateTests {

        @Test
        @DisplayName("Should activate connector successfully")
        void shouldActivateConnector() throws Exception {
            IntegrationConnectorConfigEntity entity = mock(IntegrationConnectorConfigEntity.class);
            when(entity.getId()).thenReturn(UUID.randomUUID());
            when(entity.getStatus()).thenReturn(ConnectorStatus.ACTIVE);
            when(entity.getDisplayName()).thenReturn("Slack");
            when(entity.getEventSubscriptions()).thenReturn("");
            when(entity.getCreatedAt()).thenReturn(LocalDateTime.now());
            when(entity.getUpdatedAt()).thenReturn(LocalDateTime.now());

            when(configRepository.findByTenantIdAndConnectorIdAndIsDeletedFalse(any(UUID.class), eq("slack")))
                    .thenReturn(Optional.of(entity));

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(post("/api/v1/integrations/connectors/slack/activate"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("ACTIVE"));
            }
        }

        @Test
        @DisplayName("Should deactivate connector successfully")
        void shouldDeactivateConnector() throws Exception {
            IntegrationConnectorConfigEntity entity = mock(IntegrationConnectorConfigEntity.class);
            when(entity.getId()).thenReturn(UUID.randomUUID());
            when(entity.getStatus()).thenReturn(ConnectorStatus.INACTIVE);
            when(entity.getDisplayName()).thenReturn("Slack");
            when(entity.getEventSubscriptions()).thenReturn("");
            when(entity.getCreatedAt()).thenReturn(LocalDateTime.now());
            when(entity.getUpdatedAt()).thenReturn(LocalDateTime.now());

            when(configRepository.findByTenantIdAndConnectorIdAndIsDeletedFalse(any(UUID.class), eq("slack")))
                    .thenReturn(Optional.of(entity));

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(post("/api/v1/integrations/connectors/slack/deactivate"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("INACTIVE"));
            }
        }
    }

    @Nested
    @DisplayName("Event Log Tests")
    class EventLogTests {

        @Test
        @DisplayName("Should get integration event log with pagination")
        void shouldGetEventLog() throws Exception {
            IntegrationEventLog eventLog = mock(IntegrationEventLog.class);
            when(eventLog.getId()).thenReturn(UUID.randomUUID());
            when(eventLog.getConnectorId()).thenReturn("slack");
            when(eventLog.getEventType()).thenReturn("employee.created");
            when(eventLog.getStatus()).thenReturn("SUCCESS");
            when(eventLog.getCreatedAt()).thenReturn(LocalDateTime.now());

            Page<IntegrationEventLog> page = new PageImpl<>(
                    List.of(eventLog), PageRequest.of(0, 20), 1);

            when(eventLogRepository.findByTenantIdOrderByCreatedAtDesc(any(UUID.class), any(Pageable.class)))
                    .thenReturn(page);

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/integrations/events"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content", hasSize(1)))
                        .andExpect(jsonPath("$.content[0].connectorId").value("slack"));
            }
        }

        @Test
        @DisplayName("Should filter event log by status")
        void shouldFilterEventLogByStatus() throws Exception {
            Page<IntegrationEventLog> page = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(0, 20), 0);

            when(eventLogRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(
                    any(UUID.class), eq("FAILED"), any(Pageable.class)))
                    .thenReturn(page);

            try (var tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(UUID.randomUUID());

                mockMvc.perform(get("/api/v1/integrations/events")
                                .param("status", "FAILED"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content", hasSize(0)));
            }
        }
    }
}
