package com.hrms.api.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.auth.dto.*;
import com.hrms.application.auth.service.AuthService;
import com.hrms.common.config.CookieConfig;
import com.hrms.common.security.ApiKeyAuthenticationFilter;
import com.hrms.common.security.ApiKeyService;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.RateLimitFilter;
import com.hrms.common.security.RateLimitingFilter;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.ScopeContextService;
import com.hrms.common.security.TenantFilter;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.Optional;

import org.springframework.http.ResponseCookie;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@ContextConfiguration(classes = {AuthController.class, AuthControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AuthController Integration Tests")
class AuthControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private CookieConfig cookieConfig;

    @MockBean
    private ApiKeyService apiKeyService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private EmployeeRepository employeeRepository;

    @MockBean
    private ScopeContextService scopeContextService;

    @MockBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private RateLimitFilter rateLimitFilter;

    @MockBean
    private RateLimitingFilter rateLimitingFilter;

    @MockBean
    private TenantFilter tenantFilter;

    @MockBean
    private com.hrms.application.auth.service.MfaService mfaService;

    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        when(cookieConfig.isSecureCookie()).thenReturn(false);

        // Stub CookieConfig to return ResponseCookie objects (controller uses response.addHeader("Set-Cookie", cookie.toString()))
        when(cookieConfig.createAccessTokenCookie(anyString()))
                .thenReturn(ResponseCookie.from("access_token", "test-token").path("/").build());
        when(cookieConfig.createRefreshTokenCookie(anyString()))
                .thenReturn(ResponseCookie.from("refresh_token", "test-token").path("/api/v1/auth").build());
        when(cookieConfig.createClearAccessTokenCookie())
                .thenReturn(ResponseCookie.from("access_token", "").path("/").maxAge(0).build());
        when(cookieConfig.createClearRefreshTokenCookie())
                .thenReturn(ResponseCookie.from("refresh_token", "").path("/api/v1/auth").maxAge(0).build());

        authResponse = AuthResponse.builder()
                .accessToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-access-token")
                .refreshToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-refresh-token")
                .tokenType("Bearer")
                .expiresIn(3600L)
                .userId(UUID.randomUUID())
                .tenantId(UUID.randomUUID())
                .email("john.doe@example.com")
                .fullName("John Doe")
                .build();
    }

    @Nested
    @DisplayName("Login Tests")
    class LoginTests {

        @Test
        @DisplayName("Should login successfully with valid credentials")
        void shouldLoginSuccessfully() throws Exception {
            LoginRequest request = new LoginRequest();
            request.setEmail("john.doe@example.com");
            request.setPassword("password123");

            when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").exists())
                    .andExpect(jsonPath("$.refreshToken").exists())
                    .andExpect(jsonPath("$.tokenType").value("Bearer"))
                    .andExpect(jsonPath("$.email").value("john.doe@example.com"));

            verify(authService).login(any(LoginRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid login request")
        void shouldReturn400ForInvalidRequest() throws Exception {
            LoginRequest request = new LoginRequest();
            // Missing required fields

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Google Login Tests")
    class GoogleLoginTests {

        @Test
        @DisplayName("Should login with Google token successfully")
        void shouldLoginWithGoogleTokenSuccessfully() throws Exception {
            GoogleLoginRequest request = new GoogleLoginRequest();
            request.setCredential("google-credential-token-123");

            when(authService.googleLogin(any(GoogleLoginRequest.class))).thenReturn(authResponse);

            mockMvc.perform(post("/api/v1/auth/google")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").exists());

            verify(authService).googleLogin(any(GoogleLoginRequest.class));
        }
    }

    @Nested
    @DisplayName("Token Refresh Tests")
    class RefreshTests {

        @Test
        @DisplayName("Should refresh token successfully")
        void shouldRefreshTokenSuccessfully() throws Exception {
            when(authService.refresh(anyString())).thenReturn(authResponse);

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .header("X-Refresh-Token", "valid-refresh-token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").exists());

            verify(authService).refresh("valid-refresh-token");
        }

        @Test
        @DisplayName("Should return 400 when refresh token header is missing")
        void shouldReturn400WhenRefreshTokenMissing() throws Exception {
            mockMvc.perform(post("/api/v1/auth/refresh"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Logout Tests")
    class LogoutTests {

        @Test
        @DisplayName("Should logout successfully")
        void shouldLogoutSuccessfully() throws Exception {
            doNothing().when(authService).logout(anyString());

            mockMvc.perform(post("/api/v1/auth/logout")
                            .header("Authorization", "Bearer valid-token"))
                    .andExpect(status().isOk());

            verify(authService).logout("valid-token");
        }
    }

    @Nested
    @DisplayName("Change Password Tests")
    class ChangePasswordTests {

        @Test
        @DisplayName("Should change password successfully")
        void shouldChangePasswordSuccessfully() throws Exception {
            UUID userId = UUID.randomUUID();
            ChangePasswordRequest request = new ChangePasswordRequest();
            request.setCurrentPassword("oldPassword123");
            request.setNewPassword("newPassword456");
            request.setConfirmPassword("newPassword456");

            try (MockedStatic<SecurityContext> securityContextMock = mockStatic(SecurityContext.class)) {
                securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                doNothing().when(authService).changePassword(any(UUID.class), any(ChangePasswordRequest.class));

                mockMvc.perform(post("/api/v1/auth/change-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk());

                verify(authService).changePassword(eq(userId), any(ChangePasswordRequest.class));
            }
        }
    }

    @Nested
    @DisplayName("Forgot Password Tests")
    class ForgotPasswordTests {

        @Test
        @DisplayName("Should request password reset successfully")
        void shouldRequestPasswordResetSuccessfully() throws Exception {
            ForgotPasswordRequest request = new ForgotPasswordRequest();
            request.setEmail("john.doe@example.com");

            when(authService.requestPasswordReset(anyString())).thenReturn("reset-token");

            mockMvc.perform(post("/api/v1/auth/forgot-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("If an account exists with this email, a password reset link has been sent."));

            verify(authService).requestPasswordReset("john.doe@example.com");
        }
    }

    @Nested
    @DisplayName("Reset Password Tests")
    class ResetPasswordTests {

        @Test
        @DisplayName("Should reset password successfully")
        void shouldResetPasswordSuccessfully() throws Exception {
            ResetPasswordRequest request = new ResetPasswordRequest();
            request.setToken("valid-reset-token");
            request.setNewPassword("newSecurePassword123");
            request.setConfirmPassword("newSecurePassword123");

            doNothing().when(authService).resetPassword(any(ResetPasswordRequest.class));

            mockMvc.perform(post("/api/v1/auth/reset-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Password has been reset successfully."));

            verify(authService).resetPassword(any(ResetPasswordRequest.class));
        }
    }
}
