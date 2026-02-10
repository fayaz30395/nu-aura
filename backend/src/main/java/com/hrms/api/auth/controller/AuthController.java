package com.hrms.api.auth.controller;

import com.hrms.api.auth.dto.*;
import java.util.Map;
import com.hrms.application.auth.service.AuthService;
import com.hrms.common.config.CookieConfig;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.common.security.SecurityContext;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Public endpoints - no RBAC required
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private CookieConfig cookieConfig;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.login(request);

        // Set secure httpOnly cookies
        setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

        // Return response (tokens also in body for backward compatibility during migration)
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.googleLogin(request);

        // Set secure httpOnly cookies
        setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestHeader(value = "X-Refresh-Token", required = false) String refreshTokenHeader,
            @CookieValue(value = CookieConfig.REFRESH_TOKEN_COOKIE, required = false) String refreshTokenCookie,
            HttpServletResponse response) {

        // Support both header and cookie (prefer cookie for security)
        String refreshToken = refreshTokenCookie != null ? refreshTokenCookie : refreshTokenHeader;

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        // Revoke the old refresh token before issuing a new one
        tokenProvider.revokeToken(refreshToken);

        AuthResponse authResponse = authService.refresh(refreshToken);

        // Set new cookies
        setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @CookieValue(value = CookieConfig.ACCESS_TOKEN_COOKIE, required = false) String accessTokenCookie,
            @CookieValue(value = CookieConfig.REFRESH_TOKEN_COOKIE, required = false) String refreshTokenCookie,
            HttpServletResponse response) {

        // Extract access token from header or cookie
        String accessToken = null;
        if (accessTokenCookie != null) {
            accessToken = accessTokenCookie;
        } else if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }

        // Revoke tokens
        if (accessToken != null) {
            tokenProvider.revokeToken(accessToken);
        }
        if (refreshTokenCookie != null) {
            tokenProvider.revokeToken(refreshTokenCookie);
        }

        // Clear auth state
        authService.logout(accessToken);

        // Clear cookies
        clearAuthCookies(response);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        // Get current authenticated user ID from SecurityContext
        authService.changePassword(SecurityContext.getCurrentUserId(), request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "If an account exists with this email, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
    }

    // ==================== Cookie Helper Methods ====================

    /**
     * Set secure httpOnly cookies for access and refresh tokens.
     * Uses ResponseCookie for proper SameSite support.
     */
    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        // Access token cookie - sent with all requests
        ResponseCookie accessCookie = ResponseCookie.from(CookieConfig.ACCESS_TOKEN_COOKIE, accessToken)
                .httpOnly(true)
                .secure(cookieConfig.isSecureCookie())
                .path("/")
                .maxAge(3600) // 1 hour
                .sameSite("Strict")
                .build();

        // Refresh token cookie - only sent to auth endpoints
        ResponseCookie refreshCookie = ResponseCookie.from(CookieConfig.REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(cookieConfig.isSecureCookie())
                .path("/api/v1/auth")
                .maxAge(86400) // 24 hours
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    /**
     * Clear auth cookies (for logout).
     */
    private void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie clearAccessCookie = ResponseCookie.from(CookieConfig.ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(cookieConfig.isSecureCookie())
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        ResponseCookie clearRefreshCookie = ResponseCookie.from(CookieConfig.REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(cookieConfig.isSecureCookie())
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, clearAccessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefreshCookie.toString());
    }
}
