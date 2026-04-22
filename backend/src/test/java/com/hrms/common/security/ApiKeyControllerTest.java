package com.hrms.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApiKeyController.class)
@ContextConfiguration(classes = {ApiKeyController.class, ApiKeyControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ApiKeyController Tests")
class ApiKeyControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
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
    private UUID userId;
    private UUID keyId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        keyId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Create API Key Tests")
    class CreateTests {

        @Test
        @DisplayName("Should create API key successfully")
        void shouldCreateApiKey() throws Exception {
            ApiKeyController.CreateApiKeyRequest request = new ApiKeyController.CreateApiKeyRequest(
                    "CI/CD Pipeline Key", "For GitHub Actions", Set.of("read:employees"), null);

            ApiKey mockKey = mock(ApiKey.class);
            when(mockKey.getName()).thenReturn("CI/CD Pipeline Key");
            when(mockKey.getKeyPrefix()).thenReturn("nua_");
            when(mockKey.getScopes()).thenReturn(Set.of("read:employees"));
            when(mockKey.getExpiresAt()).thenReturn(null);

            ApiKeyService.ApiKeyCreationResult result = new ApiKeyService.ApiKeyCreationResult(
                    keyId, "nua_live_abc123xyz789", mockKey);

            try (MockedStatic<TenantContext> tCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sCtx = mockStatic(SecurityContext.class)) {
                tCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                sCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(apiKeyService.createApiKey(
                        eq("CI/CD Pipeline Key"), eq("For GitHub Actions"),
                        eq(Set.of("read:employees")), isNull(), eq(tenantId), eq(userId)))
                        .thenReturn(result);

                mockMvc.perform(post("/api/v1/admin/api-keys")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.rawKey").value("nua_live_abc123xyz789"))
                        .andExpect(jsonPath("$.name").value("CI/CD Pipeline Key"));
            }
        }
    }

    @Nested
    @DisplayName("List API Keys Tests")
    class ListTests {

        @Test
        @DisplayName("Should list active API keys")
        void shouldListActiveKeys() throws Exception {
            ApiKey mockKey = mock(ApiKey.class);
            when(mockKey.getId()).thenReturn(keyId);
            when(mockKey.getName()).thenReturn("My Key");
            when(mockKey.getDescription()).thenReturn("Test key");
            when(mockKey.getKeyPrefix()).thenReturn("nua_");
            when(mockKey.getScopes()).thenReturn(Set.of("read:employees"));
            when(mockKey.getIsActive()).thenReturn(true);
            when(mockKey.getCreatedAt()).thenReturn(LocalDateTime.now());

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(apiKeyService.getActiveApiKeysByTenant(tenantId)).thenReturn(List.of(mockKey));

                mockMvc.perform(get("/api/v1/admin/api-keys"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(1)))
                        .andExpect(jsonPath("$[0].name").value("My Key"))
                        .andExpect(jsonPath("$[0].maskedKey").value("nua_..."));
            }
        }

        @Test
        @DisplayName("Should list all keys including inactive")
        void shouldListAllKeys() throws Exception {
            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(apiKeyService.getApiKeysByTenant(tenantId)).thenReturn(Collections.emptyList());

                mockMvc.perform(get("/api/v1/admin/api-keys")
                                .param("includeInactive", "true"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(0)));

                verify(apiKeyService).getApiKeysByTenant(tenantId);
            }
        }
    }

    @Nested
    @DisplayName("Revoke API Key Tests")
    class RevokeTests {

        @Test
        @DisplayName("Should revoke API key")
        void shouldRevokeApiKey() throws Exception {
            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                doNothing().when(apiKeyService).revokeApiKey(keyId, tenantId);

                mockMvc.perform(delete("/api/v1/admin/api-keys/{keyId}", keyId))
                        .andExpect(status().isNoContent());

                verify(apiKeyService).revokeApiKey(keyId, tenantId);
            }
        }
    }

    @Nested
    @DisplayName("Regenerate API Key Tests")
    class RegenerateTests {

        @Test
        @DisplayName("Should regenerate API key")
        void shouldRegenerateApiKey() throws Exception {
            ApiKey mockKey = mock(ApiKey.class);
            when(mockKey.getName()).thenReturn("Regenerated Key");
            when(mockKey.getKeyPrefix()).thenReturn("nua_");
            when(mockKey.getScopes()).thenReturn(Set.of("read:employees"));
            when(mockKey.getExpiresAt()).thenReturn(null);

            ApiKeyService.ApiKeyCreationResult result = new ApiKeyService.ApiKeyCreationResult(
                    UUID.randomUUID(), "nua_live_newkey789", mockKey);

            try (MockedStatic<TenantContext> tCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sCtx = mockStatic(SecurityContext.class)) {
                tCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                sCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(apiKeyService.regenerateApiKey(keyId, tenantId, userId)).thenReturn(result);

                mockMvc.perform(post("/api/v1/admin/api-keys/{keyId}/regenerate", keyId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.rawKey").value("nua_live_newkey789"));
            }
        }
    }

    @Nested
    @DisplayName("Update Scopes Tests")
    class UpdateScopesTests {

        @Test
        @DisplayName("Should update API key scopes")
        void shouldUpdateScopes() throws Exception {
            ApiKeyController.UpdateScopesRequest request = new ApiKeyController.UpdateScopesRequest(
                    Set.of("read:employees", "write:employees"));

            ApiKey mockKey = mock(ApiKey.class);
            when(mockKey.getId()).thenReturn(keyId);
            when(mockKey.getName()).thenReturn("Updated Key");
            when(mockKey.getKeyPrefix()).thenReturn("nua_");
            when(mockKey.getScopes()).thenReturn(Set.of("read:employees", "write:employees"));
            when(mockKey.getIsActive()).thenReturn(true);
            when(mockKey.getCreatedAt()).thenReturn(LocalDateTime.now());

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(apiKeyService.updateScopes(keyId, tenantId, Set.of("read:employees", "write:employees")))
                        .thenReturn(mockKey);

                mockMvc.perform(put("/api/v1/admin/api-keys/{keyId}/scopes", keyId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.name").value("Updated Key"));
            }
        }
    }

    @Nested
    @DisplayName("Permanent Delete Tests")
    class PermanentDeleteTests {

        @Test
        @DisplayName("Should permanently delete API key")
        void shouldPermanentlyDelete() throws Exception {
            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                doNothing().when(apiKeyService).deleteApiKey(keyId, tenantId);

                mockMvc.perform(delete("/api/v1/admin/api-keys/{keyId}/permanent", keyId))
                        .andExpect(status().isNoContent());

                verify(apiKeyService).deleteApiKey(keyId, tenantId);
            }
        }
    }
}
