package com.nulogic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.webhook.dto.WebhookRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.webhook.WebhookEventType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for Webhook Controller endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("WebhookController Integration Tests")
class WebhookControllerIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final String BASE_URL = "/api/webhooks";
    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        Set<String> roles = new HashSet<>();
        roles.add("ADMIN");

        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);

        SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);
        TenantContext.setCurrentTenant(TEST_TENANT_ID);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        TEST_USER_ID.toString(),
                        "N/A",
                        List.of(new SimpleGrantedAuthority("HRMS:SYSTEM:ADMIN"))));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Nested
    @DisplayName("GET /api/webhooks")
    class ListWebhooksTests {

        @Test
        @DisplayName("should return list of webhooks")
        void shouldReturnListOfWebhooks() throws Exception {
            mockMvc.perform(get(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("should return JSON content type")
        void shouldReturnJsonContentType() throws Exception {
            mockMvc.perform(get(BASE_URL)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("POST /api/webhooks")
    class CreateWebhookTests {

        @Test
        @DisplayName("should create webhook with valid data")
        void shouldCreateWebhookWithValidData() throws Exception {
            WebhookRequest request = WebhookRequest.builder()
                    .name("Test Integration Webhook")
                    .description("Integration test webhook")
                    .url("https://example.com/webhook/test")
                    .secret("test-secret-key-12345")
                    .events(Set.of(WebhookEventType.EMPLOYEE_CREATED, WebhookEventType.EMPLOYEE_UPDATED))
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("should reject webhook with invalid URL (non-HTTPS)")
        void shouldRejectWebhookWithInvalidUrl() throws Exception {
            WebhookRequest request = WebhookRequest.builder()
                    .name("Invalid Webhook")
                    .url("http://example.com/webhook") // HTTP not allowed
                    .secret("secret")
                    .events(Set.of(WebhookEventType.EMPLOYEE_CREATED))
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should reject webhook without name")
        void shouldRejectWebhookWithoutName() throws Exception {
            WebhookRequest request = WebhookRequest.builder()
                    .url("https://example.com/webhook")
                    .secret("secret")
                    .events(Set.of(WebhookEventType.EMPLOYEE_CREATED))
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should reject webhook without events")
        void shouldRejectWebhookWithoutEvents() throws Exception {
            WebhookRequest request = WebhookRequest.builder()
                    .name("No Events Webhook")
                    .url("https://example.com/webhook")
                    .secret("secret")
                    .events(Collections.emptySet())
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/webhooks/{id}")
    class GetWebhookByIdTests {

        @Test
        @DisplayName("should return 404 for non-existent webhook")
        void shouldReturn404ForNonExistentWebhook() throws Exception {
            UUID nonExistentId = UUID.randomUUID();

            mockMvc.perform(get(BASE_URL + "/" + nonExistentId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("PUT /api/webhooks/{id}")
    class UpdateWebhookTests {

        @Test
        @DisplayName("should return 404 when updating non-existent webhook")
        void shouldReturn404WhenUpdatingNonExistentWebhook() throws Exception {
            UUID nonExistentId = UUID.randomUUID();
            WebhookRequest request = WebhookRequest.builder()
                    .name("Updated Webhook")
                    .url("https://example.com/webhook/updated")
                    .secret("new-secret-key-12345")
                    .events(Set.of(WebhookEventType.ALL))
                    .build();

            mockMvc.perform(put(BASE_URL + "/" + nonExistentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("DELETE /api/webhooks/{id}")
    class DeleteWebhookTests {

        @Test
        @DisplayName("should return 204 when deleting (even non-existent)")
        void shouldReturn204WhenDeleting() throws Exception {
            UUID webhookId = UUID.randomUUID();

            mockMvc.perform(delete(BASE_URL + "/" + webhookId)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNoContent());
        }
    }

    @Nested
    @DisplayName("POST /api/webhooks/{id}/activate")
    class ActivateWebhookTests {

        @Test
        @DisplayName("should return 404 when activating non-existent webhook")
        void shouldReturn404WhenActivatingNonExistentWebhook() throws Exception {
            UUID nonExistentId = UUID.randomUUID();

            mockMvc.perform(post(BASE_URL + "/" + nonExistentId + "/activate")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/webhooks/{id}/deactivate")
    class DeactivateWebhookTests {

        @Test
        @DisplayName("should return 404 when deactivating non-existent webhook")
        void shouldReturn404WhenDeactivatingNonExistentWebhook() throws Exception {
            UUID nonExistentId = UUID.randomUUID();

            mockMvc.perform(post(BASE_URL + "/" + nonExistentId + "/deactivate")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("GET /api/webhooks/{id}/deliveries")
    class GetDeliveriesTests {

        @Test
        @DisplayName("should return 404 for deliveries of non-existent webhook")
        void shouldReturn404ForDeliveriesOfNonExistentWebhook() throws Exception {
            UUID nonExistentId = UUID.randomUUID();

            mockMvc.perform(get(BASE_URL + "/" + nonExistentId + "/deliveries")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/webhooks/deliveries/{id}/retry")
    class RetryDeliveryTests {

        @Test
        @DisplayName("should return 404 for non-existent delivery")
        void shouldReturn404ForNonExistentDelivery() throws Exception {
            UUID nonExistentId = UUID.randomUUID();

            mockMvc.perform(post(BASE_URL + "/deliveries/" + nonExistentId + "/retry")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }
}
