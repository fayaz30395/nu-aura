package com.hrms.api.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.auth.dto.MfaSetupResponse;
import com.hrms.api.auth.dto.MfaStatusResponse;
import com.hrms.api.auth.dto.MfaVerifyRequest;
import com.hrms.application.auth.service.MfaService;
import com.hrms.common.exception.AuthenticationException;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MfaController.class)
@ContextConfiguration(classes = {MfaController.class, MfaControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MfaController Unit Tests")
class MfaControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private MfaService mfaService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private RateLimitFilter rateLimitFilter;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @MockitoBean
    private ApiKeyService apiKeyService;

    @MockitoBean
    private ScopeContextService scopeContextService;

    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");

    private MockedStatic<SecurityContext> securityContextMock;

    private MfaSetupResponse sampleSetupResponse;
    private MfaStatusResponse enabledStatus;
    private MfaStatusResponse disabledStatus;

    @BeforeEach
    void setUp() {
        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(USER_ID);

        sampleSetupResponse = MfaSetupResponse.builder()
                .qrCodeUrl("otpauth://totp/NU-AURA:user@test.com?secret=BASE32SECRET&issuer=NU-AURA")
                .secret("BASE32SECRET")
                .backupCodes(List.of("BACKUP-001", "BACKUP-002", "BACKUP-003",
                        "BACKUP-004", "BACKUP-005", "BACKUP-006",
                        "BACKUP-007", "BACKUP-008"))
                .build();

        enabledStatus = MfaStatusResponse.builder()
                .enabled(true)
                .setupAt(LocalDateTime.now().minusDays(7))
                .build();

        disabledStatus = MfaStatusResponse.builder()
                .enabled(false)
                .setupAt(null)
                .build();
    }

    @AfterEach
    void tearDown() {
        securityContextMock.close();
    }

    // ==================== Setup Tests ====================

    @Nested
    @DisplayName("MFA Setup Tests")
    class MfaSetupTests {

        @Test
        @DisplayName("GET /setup — initiates MFA setup, returns QR code and backup codes")
        void setupMfa_ReturnsSetupResponse() throws Exception {
            when(mfaService.setupMfa(USER_ID)).thenReturn(sampleSetupResponse);

            mockMvc.perform(get("/api/v1/auth/mfa/setup"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.qrCodeUrl").value(sampleSetupResponse.getQrCodeUrl()))
                    .andExpect(jsonPath("$.secret").value("BASE32SECRET"))
                    .andExpect(jsonPath("$.backupCodes").isArray())
                    .andExpect(jsonPath("$.backupCodes.length()").value(8));

            verify(mfaService).setupMfa(USER_ID);
        }

        @Test
        @DisplayName("GET /setup — uses current user ID from SecurityContext")
        void setupMfa_UsesCurrentUserId() throws Exception {
            when(mfaService.setupMfa(USER_ID)).thenReturn(sampleSetupResponse);

            mockMvc.perform(get("/api/v1/auth/mfa/setup"))
                    .andExpect(status().isOk());

            verify(mfaService).setupMfa(USER_ID);
            securityContextMock.verify(SecurityContext::getCurrentUserId);
        }
    }

    // ==================== Verify Tests ====================

    @Nested
    @DisplayName("MFA Verify Tests")
    class MfaVerifyTests {

        @Test
        @DisplayName("POST /verify — verifies valid TOTP code and enables MFA")
        void verifyMfa_ValidCode_EnablesMfa() throws Exception {
            MfaVerifyRequest request = MfaVerifyRequest.builder().code("123456").build();

            doNothing().when(mfaService).verifyAndEnableMfa(eq(USER_ID), eq("123456"));
            when(mfaService.getMfaStatus(USER_ID)).thenReturn(enabledStatus);

            mockMvc.perform(post("/api/v1/auth/mfa/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.enabled").value(true))
                    .andExpect(jsonPath("$.setupAt").exists());

            verify(mfaService).verifyAndEnableMfa(USER_ID, "123456");
            verify(mfaService).getMfaStatus(USER_ID);
        }

        @Test
        @DisplayName("POST /verify — returns 401 when TOTP code is invalid")
        void verifyMfa_InvalidCode_ReturnsUnauthorized() throws Exception {
            MfaVerifyRequest request = MfaVerifyRequest.builder().code("000000").build();

            doThrow(new AuthenticationException("Invalid TOTP code"))
                    .when(mfaService).verifyAndEnableMfa(eq(USER_ID), eq("000000"));

            mockMvc.perform(post("/api/v1/auth/mfa/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());

            verify(mfaService).verifyAndEnableMfa(USER_ID, "000000");
            verify(mfaService, never()).getMfaStatus(any());
        }

        @Test
        @DisplayName("POST /verify — returns 400 when code is blank (@NotBlank enforced)")
        void verifyMfa_BlankCode_ReturnsBadRequest() throws Exception {
            MfaVerifyRequest request = MfaVerifyRequest.builder().code("").build();

            mockMvc.perform(post("/api/v1/auth/mfa/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(mfaService);
        }

        @Test
        @DisplayName("POST /verify — returns 400 when code is null")
        void verifyMfa_NullCode_ReturnsBadRequest() throws Exception {
            String requestBody = "{\"code\": null}";

            mockMvc.perform(post("/api/v1/auth/mfa/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(mfaService);
        }

        @Test
        @DisplayName("POST /verify — accepts backup code format")
        void verifyMfa_BackupCode_ReturnsSuccess() throws Exception {
            MfaVerifyRequest request = MfaVerifyRequest.builder().code("BACKUP-001").build();

            doNothing().when(mfaService).verifyAndEnableMfa(eq(USER_ID), eq("BACKUP-001"));
            when(mfaService.getMfaStatus(USER_ID)).thenReturn(enabledStatus);

            mockMvc.perform(post("/api/v1/auth/mfa/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());
        }
    }

    // ==================== Disable Tests ====================

    @Nested
    @DisplayName("MFA Disable Tests")
    class MfaDisableTests {

        @Test
        @DisplayName("DELETE /disable — disables MFA with valid code")
        void disableMfa_ValidCode_ReturnsSuccessMessage() throws Exception {
            MfaVerifyRequest request = MfaVerifyRequest.builder().code("123456").build();

            doNothing().when(mfaService).disableMfa(eq(USER_ID), eq("123456"));

            mockMvc.perform(delete("/api/v1/auth/mfa/disable")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("MFA has been disabled successfully"));

            verify(mfaService).disableMfa(USER_ID, "123456");
        }

        @Test
        @DisplayName("DELETE /disable — returns 401 when TOTP code is wrong")
        void disableMfa_InvalidCode_ReturnsUnauthorized() throws Exception {
            MfaVerifyRequest request = MfaVerifyRequest.builder().code("999999").build();

            doThrow(new AuthenticationException("Invalid TOTP code"))
                    .when(mfaService).disableMfa(eq(USER_ID), eq("999999"));

            mockMvc.perform(delete("/api/v1/auth/mfa/disable")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error").value("Invalid MFA code"));
        }

        @Test
        @DisplayName("DELETE /disable — returns 400 when code is blank")
        void disableMfa_BlankCode_ReturnsBadRequest() throws Exception {
            MfaVerifyRequest request = MfaVerifyRequest.builder().code("   ").build();

            mockMvc.perform(delete("/api/v1/auth/mfa/disable")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(mfaService);
        }
    }

    // ==================== Status Tests ====================

    @Nested
    @DisplayName("MFA Status Tests")
    class MfaStatusTests {

        @Test
        @DisplayName("GET /status — returns enabled status for MFA-enabled user")
        void getMfaStatus_Enabled_ReturnsEnabledTrue() throws Exception {
            when(mfaService.getMfaStatus(USER_ID)).thenReturn(enabledStatus);

            mockMvc.perform(get("/api/v1/auth/mfa/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.enabled").value(true))
                    .andExpect(jsonPath("$.setupAt").exists());

            verify(mfaService).getMfaStatus(USER_ID);
        }

        @Test
        @DisplayName("GET /status — returns disabled status for user without MFA")
        void getMfaStatus_Disabled_ReturnsEnabledFalse() throws Exception {
            when(mfaService.getMfaStatus(USER_ID)).thenReturn(disabledStatus);

            mockMvc.perform(get("/api/v1/auth/mfa/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.enabled").value(false));

            verify(mfaService).getMfaStatus(USER_ID);
        }
    }
}
