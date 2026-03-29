package com.hrms.api.auth.controller;

import com.hrms.api.auth.dto.*;
import java.util.Map;
import com.hrms.application.auth.service.AuthService;
import com.hrms.application.auth.service.MfaService;
import com.hrms.common.config.CookieConfig;
import com.hrms.common.exception.AuthenticationException;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Public endpoints - no RBAC required
@RestController
@RequestMapping("/api/v1/auth")
@Slf4j
@Tag(name = "Authentication", description = "Authentication endpoints")
public class AuthController {

    private final AuthService authService;
    private final MfaService mfaService;
    private final CookieConfig cookieConfig;
    private final JwtTokenProvider tokenProvider;

    public AuthController(AuthService authService,
                          MfaService mfaService,
                          CookieConfig cookieConfig,
                          JwtTokenProvider tokenProvider) {
        this.authService = authService;
        this.mfaService = mfaService;
        this.cookieConfig = cookieConfig;
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password", description = "Authenticate user with email and password. If MFA is enabled, response will indicate MFA is required.")
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
    @Operation(summary = "Login with Google", description = "Authenticate user with Google OAuth token")
    public ResponseEntity<AuthResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.googleLogin(request);

        // Set secure httpOnly cookies
        setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/mfa-login")
    @Operation(summary = "Complete MFA second-factor authentication", description = "Verify MFA code after initial password authentication. Returns full authentication tokens if verification succeeds.")
    public ResponseEntity<AuthResponse> mfaLogin(
            @Valid @RequestBody MfaLoginRequest request,
            HttpServletResponse response) {
        log.info("MFA login initiated for user: {}", request.getUserId());

        try {
            // Verify the MFA code
            if (!mfaService.verifyMfaCode(request.getUserId(), request.getCode())) {
                log.warn("Invalid MFA code for user: {}", request.getUserId());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder()
                        .accessToken(null)
                        .build());
            }

            // Get full authentication tokens for the user
            AuthResponse authResponse = authService.loginAfterMfa(request.getUserId());

            // Check if backup code was used and consume it
            if (request.getCode().length() > 6) { // Backup codes are longer than TOTP codes
                mfaService.consumeBackupCode(request.getUserId(), request.getCode());
            }

            // Set secure httpOnly cookies
            setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

            return ResponseEntity.ok(authResponse);
        } catch (Exception e) {
            log.error("MFA login failed for user: {}", request.getUserId(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(AuthResponse.builder()
                    .accessToken(null)
                    .build());
        }
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Use refresh token to get new access token")
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
    @Operation(summary = "Logout user", description = "Revoke tokens and clear authentication state")
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
    @Operation(summary = "Change password", description = "Change password for authenticated user")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        // Get current authenticated user ID from SecurityContext
        authService.changePassword(SecurityContext.getCurrentUserId(), request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset", description = "Request a password reset link via email. Returns authProvider=GOOGLE if user uses SSO.")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String authProvider = authService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of(
                "message", "If an account exists with this email, a password reset link has been sent.",
                "authProvider", authProvider
        ));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password", description = "Reset password using reset token from email")
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
        // SEC: Delegate to CookieConfig which sets HttpOnly, Secure, SameSite=Strict, Path
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createAccessTokenCookie(accessToken).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createRefreshTokenCookie(refreshToken).toString());
    }

    /**
     * Clear auth cookies (for logout).
     */
    private void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createClearAccessTokenCookie().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createClearRefreshTokenCookie().toString());
    }
}
