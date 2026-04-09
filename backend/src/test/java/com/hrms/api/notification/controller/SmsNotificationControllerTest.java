package com.hrms.api.notification.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.notification.dto.BulkSmsRequest;
import com.hrms.api.notification.dto.SmsNotificationRequest;
import com.hrms.application.notification.service.SmsNotificationService;
import com.hrms.application.notification.service.SmsNotificationService.SmsResult;
import com.hrms.common.security.*;
import com.hrms.config.TwilioConfig;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
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

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SmsNotificationController.class)
@ContextConfiguration(classes = {SmsNotificationController.class, SmsNotificationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("SmsNotificationController Tests")
class SmsNotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private SmsNotificationService smsNotificationService;
    @MockitoBean
    private TwilioConfig twilioConfig;
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
    @DisplayName("Send SMS Tests")
    class SendSmsTests {

        @Test
        @DisplayName("Should send SMS successfully")
        void shouldSendSmsSuccessfully() throws Exception {
            SmsNotificationRequest request = SmsNotificationRequest.builder()
                    .phoneNumber("+1234567890")
                    .message("Your leave has been approved")
                    .build();

            when(smsNotificationService.sendSms(eq("+1234567890"), anyString(), isNull()))
                    .thenReturn(SmsResult.success("SM123", "QUEUED"));
            when(twilioConfig.getFromNumber()).thenReturn("+1987654321");
            when(smsNotificationService.isMockMode()).thenReturn(true);

            mockMvc.perform(post("/api/v1/notifications/sms/send")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.messageSid").value("SM123"));
        }

        @Test
        @DisplayName("Should return 400 for failed SMS send")
        void shouldReturn400ForFailedSms() throws Exception {
            SmsNotificationRequest request = SmsNotificationRequest.builder()
                    .phoneNumber("+1234567890")
                    .message("Test message")
                    .build();

            when(smsNotificationService.sendSms(eq("+1234567890"), anyString(), isNull()))
                    .thenReturn(SmsResult.failure("Invalid phone number"));

            mockMvc.perform(post("/api/v1/notifications/sms/send")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("Should return 400 for missing phone number")
        void shouldReturn400ForMissingPhone() throws Exception {
            SmsNotificationRequest request = SmsNotificationRequest.builder()
                    .message("Test message")
                    .build();

            mockMvc.perform(post("/api/v1/notifications/sms/send")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Bulk SMS Tests")
    class BulkSmsTests {

        @Test
        @DisplayName("Should send bulk SMS successfully")
        void shouldSendBulkSms() throws Exception {
            BulkSmsRequest request = BulkSmsRequest.builder()
                    .phoneNumbers(List.of("+1234567890", "+0987654321"))
                    .message("Company announcement")
                    .build();

            Map<String, SmsResult> results = new LinkedHashMap<>();
            results.put("+1234567890", SmsResult.success("SM001", "QUEUED"));
            results.put("+0987654321", SmsResult.success("SM002", "QUEUED"));

            when(smsNotificationService.sendBulkSms(anyIterable(), anyString())).thenReturn(results);
            when(twilioConfig.getFromNumber()).thenReturn("+1111111111");
            when(smsNotificationService.isMockMode()).thenReturn(true);

            mockMvc.perform(post("/api/v1/notifications/sms/send-bulk")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].success").value(true));
        }
    }

    @Nested
    @DisplayName("Status & Validation Tests")
    class StatusTests {

        @Test
        @DisplayName("Should get SMS service status")
        void shouldGetStatus() throws Exception {
            when(smsNotificationService.getStatus())
                    .thenReturn(new SmsNotificationService.ServiceStatus(true, true, true, "+1234567890"));

            mockMvc.perform(get("/api/v1/notifications/sms/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.initialized").value(true))
                    .andExpect(jsonPath("$.mockMode").value(true))
                    .andExpect(jsonPath("$.provider").value("Twilio"));
        }

        @Test
        @DisplayName("Should validate phone number")
        void shouldValidatePhoneNumber() throws Exception {
            when(smsNotificationService.isValidPhoneNumber("+1234567890")).thenReturn(true);

            mockMvc.perform(post("/api/v1/notifications/sms/validate-number")
                            .param("phoneNumber", "+1234567890"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.valid").value(true))
                    .andExpect(jsonPath("$.formatted").value("+1234567890"));
        }

        @Test
        @DisplayName("Should handle invalid phone number validation")
        void shouldHandleInvalidPhoneValidation() throws Exception {
            when(smsNotificationService.isValidPhoneNumber("invalid")).thenReturn(false);
            when(smsNotificationService.formatPhoneNumber("invalid", "1")).thenReturn(null);

            mockMvc.perform(post("/api/v1/notifications/sms/validate-number")
                            .param("phoneNumber", "invalid"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.valid").value(false))
                    .andExpect(jsonPath("$.formatted").value("Invalid"));
        }
    }
}
