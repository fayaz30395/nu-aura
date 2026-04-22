package com.hrms.api.webhook.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.webhook.dto.WebhookRequest;
import com.hrms.application.webhook.service.WebhookService;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.webhook.*;
import com.hrms.infrastructure.webhook.repository.WebhookDeliveryRepository;
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
import org.springframework.http.MediaType;
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

@WebMvcTest(WebhookController.class)
@ContextConfiguration(classes = {WebhookController.class, GlobalExceptionHandler.class, WebhookControllerTest.TestConfig.class})
@org.springframework.context.annotation.Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("WebhookController Integration Tests")
class WebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private WebhookService webhookService;
    @MockitoBean
    private WebhookDeliveryRepository deliveryRepository;
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

    private UUID webhookId;
    private UUID tenantId;
    private Webhook webhook;

    @BeforeEach
    void setUp() {
        webhookId = UUID.randomUUID();
        tenantId = UUID.randomUUID();
        webhook = Webhook.builder()
                .name("Test Webhook")
                .description("Integration webhook")
                .url("https://example.com/webhook")
                .secret("super-secret-key-1234567890")
                .events(Set.of(WebhookEventType.EMPLOYEE_CREATED))
                .status(WebhookStatus.ACTIVE)
                .build();
        webhook.setId(webhookId);
        webhook.setTenantId(tenantId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("List Webhooks Tests")
    class ListWebhooksTests {

        @Test
        @DisplayName("Should list all webhooks for current tenant")
        void shouldListAllWebhooksForTenant() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(webhookService.findAllByTenant(tenantId)).thenReturn(List.of(webhook));

                mockMvc.perform(get("/api/webhooks"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(1)))
                        .andExpect(jsonPath("$[0].name").value("Test Webhook"));

                verify(webhookService).findAllByTenant(tenantId);
            }
        }

        @Test
        @DisplayName("Should return empty list when no webhooks exist")
        void shouldReturnEmptyListWhenNoWebhooks() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(webhookService.findAllByTenant(tenantId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get("/api/webhooks"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(0)));
            }
        }
    }

    @Nested
    @DisplayName("Get Webhook Tests")
    class GetWebhookTests {

        @Test
        @DisplayName("Should return webhook by ID")
        void shouldReturnWebhookById() throws Exception {
            when(webhookService.findById(webhookId)).thenReturn(Optional.of(webhook));

            mockMvc.perform(get("/api/webhooks/{id}", webhookId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Test Webhook"))
                    .andExpect(jsonPath("$.url").value("https://example.com/webhook"));

            verify(webhookService).findById(webhookId);
        }

        @Test
        @DisplayName("Should return 404 when webhook not found")
        void shouldReturn404WhenWebhookNotFound() throws Exception {
            when(webhookService.findById(webhookId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/webhooks/{id}", webhookId))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Create Webhook Tests")
    class CreateWebhookTests {

        @Test
        @DisplayName("Should create webhook successfully")
        void shouldCreateWebhookSuccessfully() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                WebhookRequest request = WebhookRequest.builder()
                        .name("New Webhook")
                        .description("New webhook for events")
                        .url("https://example.com/new-webhook")
                        .secret("webhook-secret-key-1234567890")
                        .events(Set.of(WebhookEventType.EMPLOYEE_CREATED, WebhookEventType.EMPLOYEE_UPDATED))
                        .build();

                when(webhookService.create(any(Webhook.class))).thenReturn(webhook);

                mockMvc.perform(post("/api/webhooks")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.name").value("Test Webhook"));

                verify(webhookService).create(any(Webhook.class));
            }
        }

        @Test
        @DisplayName("Should return 400 when webhook name is blank")
        void shouldReturn400WhenNameBlank() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                WebhookRequest request = WebhookRequest.builder()
                        .url("https://example.com/webhook")
                        .secret("webhook-secret-key-1234567890")
                        .events(Set.of(WebhookEventType.EMPLOYEE_CREATED))
                        .build();

                mockMvc.perform(post("/api/webhooks")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isBadRequest());
            }
        }
    }

    @Nested
    @DisplayName("Update Webhook Tests")
    class UpdateWebhookTests {

        @Test
        @DisplayName("Should update webhook successfully")
        void shouldUpdateWebhookSuccessfully() throws Exception {
            WebhookRequest request = WebhookRequest.builder()
                    .name("Updated Webhook")
                    .description("Updated description")
                    .url("https://example.com/updated-webhook")
                    .secret("updated-secret-key-1234567890")
                    .events(Set.of(WebhookEventType.LEAVE_APPROVED))
                    .build();

            when(webhookService.findById(webhookId)).thenReturn(Optional.of(webhook));
            when(webhookService.update(any(Webhook.class))).thenReturn(webhook);

            mockMvc.perform(put("/api/webhooks/{id}", webhookId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated Webhook"));

            verify(webhookService).findById(webhookId);
            verify(webhookService).update(any(Webhook.class));
        }
    }

    @Nested
    @DisplayName("Delete Webhook Tests")
    class DeleteWebhookTests {

        @Test
        @DisplayName("Should delete webhook successfully")
        void shouldDeleteWebhookSuccessfully() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                doNothing().when(webhookService).delete(webhookId, tenantId);

                mockMvc.perform(delete("/api/webhooks/{id}", webhookId))
                        .andExpect(status().isNoContent());

                verify(webhookService).delete(webhookId, tenantId);
            }
        }
    }

    @Nested
    @DisplayName("Activate/Deactivate Webhook Tests")
    class ActivateDeactivateTests {

        @Test
        @DisplayName("Should activate webhook successfully")
        void shouldActivateWebhookSuccessfully() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(webhookService.activate(webhookId, tenantId)).thenReturn(Optional.of(webhook));

                mockMvc.perform(post("/api/webhooks/{id}/activate", webhookId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.name").value("Test Webhook"));

                verify(webhookService).activate(webhookId, tenantId);
            }
        }

        @Test
        @DisplayName("Should deactivate webhook successfully")
        void shouldDeactivateWebhookSuccessfully() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(webhookService.deactivate(webhookId, tenantId)).thenReturn(Optional.of(webhook));

                mockMvc.perform(post("/api/webhooks/{id}/deactivate", webhookId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.name").value("Test Webhook"));

                verify(webhookService).deactivate(webhookId, tenantId);
            }
        }

        @Test
        @DisplayName("Should return 404 when activating non-existent webhook")
        void shouldReturn404WhenActivatingNonExistent() throws Exception {
            try (MockedStatic<TenantContext> tenantCtx = mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(webhookService.activate(webhookId, tenantId)).thenReturn(Optional.empty());

                mockMvc.perform(post("/api/webhooks/{id}/activate", webhookId))
                        .andExpect(status().isNotFound());
            }
        }
    }

    @Nested
    @DisplayName("Retry Delivery Tests")
    class RetryDeliveryTests {

        @Test
        @DisplayName("Should retry failed delivery successfully")
        void shouldRetryFailedDeliverySuccessfully() throws Exception {
            UUID deliveryId = UUID.randomUUID();
            WebhookDelivery delivery = WebhookDelivery.builder()
                    .webhookId(webhookId)
                    .eventId("evt-123")
                    .eventType(WebhookEventType.EMPLOYEE_CREATED)
                    .status(WebhookDelivery.DeliveryStatus.PENDING)
                    .attempts(1)
                    .build();
            delivery.setId(deliveryId);

            when(webhookService.retryDelivery(deliveryId)).thenReturn(delivery);

            mockMvc.perform(post("/api/webhooks/deliveries/{deliveryId}/retry", deliveryId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.webhookId").value(webhookId.toString()));

            verify(webhookService).retryDelivery(deliveryId);
        }
    }
}
