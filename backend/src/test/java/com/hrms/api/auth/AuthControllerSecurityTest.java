package com.hrms.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.auth.controller.AuthController;
import com.hrms.api.auth.dto.LoginRequest;
import com.hrms.application.auth.service.AuthService;
import com.hrms.application.auth.service.MfaService;
import com.hrms.common.config.CookieConfig;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.common.security.TenantFilter;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.ResponseCookie;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for authentication security features:
 * - Cookie configuration constants
 * - Auth endpoint request validation
 * - Cookie-based token refresh endpoint
 *
 * Converted from @SpringBootTest to @WebMvcTest to avoid requiring DB/Redis/Kafka.
 */
@WebMvcTest(AuthController.class)
@ContextConfiguration(classes = {AuthController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AuthControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private MfaService mfaService;

    @MockitoBean
    private CookieConfig cookieConfig;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockitoBean
    private MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        // Stub CookieConfig to return ResponseCookie objects so controller doesn't NPE
        when(cookieConfig.createAccessTokenCookie(anyString()))
                .thenReturn(ResponseCookie.from("access_token", "test-token").path("/").build());
        when(cookieConfig.createRefreshTokenCookie(anyString()))
                .thenReturn(ResponseCookie.from("refresh_token", "test-token").path("/api/v1/auth").build());
        when(cookieConfig.createClearAccessTokenCookie())
                .thenReturn(ResponseCookie.from("access_token", "").path("/").maxAge(0).build());
        when(cookieConfig.createClearRefreshTokenCookie())
                .thenReturn(ResponseCookie.from("refresh_token", "").path("/api/v1/auth").maxAge(0).build());
    }

    @Test
    @DisplayName("Cookie names should match expected values")
    void cookieNamesShouldMatchExpected() {
        // Verify cookie name constants (static fields, no bean needed)
        assertThat(CookieConfig.ACCESS_TOKEN_COOKIE).isEqualTo("access_token");
        assertThat(CookieConfig.REFRESH_TOKEN_COOKIE).isEqualTo("refresh_token");
        assertThat(CookieConfig.CSRF_TOKEN_COOKIE).isEqualTo("XSRF-TOKEN");
    }

    @Test
    @DisplayName("Login should return 400 for missing required fields")
    void loginShouldReturn400ForMissingFields() throws Exception {
        // Given - empty request body (missing required email/password)
        LoginRequest invalidRequest = new LoginRequest();

        // When/Then
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", "550e8400-e29b-41d4-a716-446655440000")
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Refresh endpoint should return 400 for missing refresh token")
    void refreshEndpointShouldReturn400ForMissingToken() throws Exception {
        // No refresh token header or cookie — should return 400
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", "550e8400-e29b-41d4-a716-446655440000"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Logout endpoint should return 200")
    void logoutEndpointShouldReturn200() throws Exception {
        doNothing().when(authService).logout(any());

        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", "550e8400-e29b-41d4-a716-446655440000"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Refresh endpoint should accept cookie-based token")
    void refreshEndpointShouldAcceptCookieBasedToken() throws Exception {
        // Given - a refresh token in cookie
        doNothing().when(tokenProvider).revokeToken(any());

        // Mock authService.refresh to return a valid response so the controller can process it
        com.hrms.api.auth.dto.AuthResponse authResponse = com.hrms.api.auth.dto.AuthResponse.builder()
                .accessToken("new-access-token")
                .refreshToken("new-refresh-token")
                .tokenType("Bearer")
                .expiresIn(3600L)
                .build();
        when(authService.refresh(anyString())).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Tenant-ID", "550e8400-e29b-41d4-a716-446655440000")
                        .cookie(new jakarta.servlet.http.Cookie(CookieConfig.REFRESH_TOKEN_COOKIE, "some-refresh-token")))
                // The cookie was read and processed successfully (not returning 400 for missing token)
                .andExpect(status().isOk());
    }
}
