package com.hrms.api.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.user.dto.NotificationPreferencesResponse;
import com.hrms.api.user.dto.UpdateNotificationPreferencesRequest;
import com.hrms.application.user.service.NotificationPreferencesService;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationPreferencesController.class)
@ContextConfiguration(classes = {NotificationPreferencesController.class, NotificationPreferencesControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("NotificationPreferencesController Tests")
class NotificationPreferencesControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private NotificationPreferencesService preferencesService;
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

    private UUID userId;
    private NotificationPreferencesResponse preferencesResponse;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        preferencesResponse = new NotificationPreferencesResponse();
        preferencesResponse.setId(UUID.randomUUID());
        preferencesResponse.setUserId(userId);
        preferencesResponse.setEmailNotifications(true);
        preferencesResponse.setPushNotifications(true);
        preferencesResponse.setSmsNotifications(false);
        preferencesResponse.setSecurityAlerts(true);
        preferencesResponse.setCreatedAt(LocalDateTime.now());
        preferencesResponse.setUpdatedAt(LocalDateTime.now());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Get Preferences Tests")
    class GetPreferencesTests {

        @Test
        @DisplayName("Should get notification preferences for current user")
        void shouldGetPreferences() throws Exception {
            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(preferencesService.getPreferences(userId)).thenReturn(preferencesResponse);

                mockMvc.perform(get("/api/v1/notification-preferences"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.emailNotifications").value(true))
                        .andExpect(jsonPath("$.pushNotifications").value(true))
                        .andExpect(jsonPath("$.smsNotifications").value(false))
                        .andExpect(jsonPath("$.securityAlerts").value(true));
            }
        }

        @Test
        @DisplayName("Should return preferences with all fields populated")
        void shouldReturnFullPreferences() throws Exception {
            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(preferencesService.getPreferences(userId)).thenReturn(preferencesResponse);

                mockMvc.perform(get("/api/v1/notification-preferences"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.id").exists())
                        .andExpect(jsonPath("$.userId").value(userId.toString()))
                        .andExpect(jsonPath("$.createdAt").exists());
            }
        }
    }

    @Nested
    @DisplayName("Update Preferences Tests")
    class UpdatePreferencesTests {

        @Test
        @DisplayName("Should update notification preferences")
        void shouldUpdatePreferences() throws Exception {
            UpdateNotificationPreferencesRequest request = new UpdateNotificationPreferencesRequest();
            request.setEmailNotifications(false);
            request.setPushNotifications(true);
            request.setSmsNotifications(true);
            request.setSecurityAlerts(true);

            NotificationPreferencesResponse updatedResponse = new NotificationPreferencesResponse();
            updatedResponse.setId(preferencesResponse.getId());
            updatedResponse.setUserId(userId);
            updatedResponse.setEmailNotifications(false);
            updatedResponse.setPushNotifications(true);
            updatedResponse.setSmsNotifications(true);
            updatedResponse.setSecurityAlerts(true);

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(preferencesService.updatePreferences(eq(userId), any(UpdateNotificationPreferencesRequest.class)))
                        .thenReturn(updatedResponse);

                mockMvc.perform(put("/api/v1/notification-preferences")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.emailNotifications").value(false))
                        .andExpect(jsonPath("$.smsNotifications").value(true));
            }
        }

        @Test
        @DisplayName("Should return 400 for missing required fields")
        void shouldReturn400ForMissingFields() throws Exception {
            // Missing all required fields
            String invalidJson = "{}";

            mockMvc.perform(put("/api/v1/notification-preferences")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidJson))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should disable all notification channels")
        void shouldDisableAllChannels() throws Exception {
            UpdateNotificationPreferencesRequest request = new UpdateNotificationPreferencesRequest();
            request.setEmailNotifications(false);
            request.setPushNotifications(false);
            request.setSmsNotifications(false);
            request.setSecurityAlerts(false);

            NotificationPreferencesResponse updatedResponse = new NotificationPreferencesResponse();
            updatedResponse.setId(preferencesResponse.getId());
            updatedResponse.setUserId(userId);
            updatedResponse.setEmailNotifications(false);
            updatedResponse.setPushNotifications(false);
            updatedResponse.setSmsNotifications(false);
            updatedResponse.setSecurityAlerts(false);

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(preferencesService.updatePreferences(eq(userId), any(UpdateNotificationPreferencesRequest.class)))
                        .thenReturn(updatedResponse);

                mockMvc.perform(put("/api/v1/notification-preferences")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.emailNotifications").value(false))
                        .andExpect(jsonPath("$.pushNotifications").value(false))
                        .andExpect(jsonPath("$.smsNotifications").value(false))
                        .andExpect(jsonPath("$.securityAlerts").value(false));
            }
        }

        @Test
        @DisplayName("Should enable all notification channels")
        void shouldEnableAllChannels() throws Exception {
            UpdateNotificationPreferencesRequest request = new UpdateNotificationPreferencesRequest();
            request.setEmailNotifications(true);
            request.setPushNotifications(true);
            request.setSmsNotifications(true);
            request.setSecurityAlerts(true);

            NotificationPreferencesResponse updatedResponse = new NotificationPreferencesResponse();
            updatedResponse.setId(preferencesResponse.getId());
            updatedResponse.setUserId(userId);
            updatedResponse.setEmailNotifications(true);
            updatedResponse.setPushNotifications(true);
            updatedResponse.setSmsNotifications(true);
            updatedResponse.setSecurityAlerts(true);

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(preferencesService.updatePreferences(eq(userId), any(UpdateNotificationPreferencesRequest.class)))
                        .thenReturn(updatedResponse);

                mockMvc.perform(put("/api/v1/notification-preferences")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.emailNotifications").value(true))
                        .andExpect(jsonPath("$.pushNotifications").value(true))
                        .andExpect(jsonPath("$.smsNotifications").value(true))
                        .andExpect(jsonPath("$.securityAlerts").value(true));
            }
        }
    }
}
