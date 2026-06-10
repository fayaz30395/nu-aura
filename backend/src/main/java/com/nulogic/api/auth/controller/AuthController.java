package com.nulogic.api.auth.controller;

import com.nulogic.api.auth.dto.*;
import com.nulogic.application.auth.service.AuthService;
import com.nulogic.application.auth.service.MfaService;
import com.nulogic.common.config.CookieConfig;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

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

    /**
     * Adds a {@link ResponseCookie} to the response as a {@code Set-Cookie} header
     * if the supplied cookie is non-null. Defensive guard for the rollover window:
     * a test double or a mis-wired bean could return {@code null} from a hardened-cookie
     * helper, and we don't want that to produce a 500 on every login.
     */
    private static void addCookieIfPresent(HttpServletResponse response, ResponseCookie cookie) {
        if (cookie != null) {
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
    }

    /**
     * Read the first cookie value matching either of the two supplied names.
     *
     * <p>Used during the {@code __Host-} rollover window so every reader accepts
     * EITHER the hardened name OR the legacy name. The hardened name is checked
     * first because, when both are present, the {@code __Host-} prefix carries
     * the stronger browser-enforced guarantees (Secure, Path=/, no Domain) and
     * therefore wins.</p>
     *
     * @param request  incoming request
     * @param hardened the {@code __Host-} prefixed cookie name to prefer
     * @param legacy   the legacy cookie name to accept as fallback
     * @return the matching cookie value, or {@code null} if neither cookie is present
     */
    private static String readCookieValue(HttpServletRequest request, String hardened, String legacy) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        String legacyValue = null;
        for (Cookie c : cookies) {
            String name = c.getName();
            if (hardened.equals(name)) {
                // Hardened wins immediately.
                return c.getValue();
            }
            if (legacy.equals(name)) {
                legacyValue = c.getValue();
                // Keep scanning — a __Host- cookie may appear later in the array.
            }
        }
        return legacyValue;
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user", description = "Returns the profile of the currently authenticated user including roles and permissions")
    public ResponseEntity<AuthResponse> getCurrentUser() {
        UUID userId = SecurityContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AuthResponse profile = authService.getUserProfile(userId);
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password", description = "Authenticate user with email and password. If MFA is enabled, response will indicate MFA is required.")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.login(request);

        // Set secure httpOnly cookies
        setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

        // Clear tokens from response body - keep only in httpOnly cookie for security
        authResponse.setAccessToken(null);
        authResponse.setRefreshToken(null);

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

        // Clear tokens from response body - keep only in httpOnly cookie for security
        authResponse.setAccessToken(null);
        authResponse.setRefreshToken(null);

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/mfa-login")
    @Operation(summary = "Complete MFA second-factor authentication", description = "Verify MFA code after initial password authentication. Returns full authentication tokens if verification succeeds.")
    public ResponseEntity<AuthResponse> mfaLogin(
            @Valid @RequestBody MfaLoginRequest request,
            HttpServletResponse response) {
        // Downgraded from INFO with userId to DEBUG: the userId is PII that
        // didn't need to land in the default log stream on every MFA step.
        log.debug("MFA login initiated");

        try {
            // M-2 / SEC (3c): the second factor MUST be bound to a successful
            // first-factor (password) login. The opaque pre-auth token minted by
            // /login is resolved+deleted server-side to obtain the userId. The
            // legacy caller-supplied userId fallback was removed: it allowed a
            // direct API call to mint full tokens with only a TOTP code for an
            // arbitrary userId, bypassing password verification entirely.
            if (!StringUtils.hasText(request.getMfaToken())) {
                log.warn("MFA login rejected — missing pre-auth token (legacy userId-only flow is no longer accepted)");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(AuthResponse.builder()
                                .accessToken(null)
                                .build());
            }
            UUID userId = authService.consumeMfaPendingToken(request.getMfaToken());

            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(AuthResponse.builder()
                                .accessToken(null)
                                .build());
            }

            // Verify the MFA code
            if (!mfaService.verifyMfaCode(userId, request.getCode())) {
                // WARN preserved (security signal) but userId masked to first 8 chars
                // — still correlatable in incidents, no full PII in default logs.
                log.warn("Invalid MFA code for user: {}", mask(userId));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(AuthResponse.builder()
                                .accessToken(null)
                                .build());
            }

            // Get full authentication tokens for the user
            AuthResponse authResponse = authService.loginAfterMfa(userId);

            // Check if backup code was used and consume it
            if (request.getCode().length() > 6) { // Backup codes are longer than TOTP codes
                mfaService.consumeBackupCode(userId, request.getCode());
            }

            // Set secure httpOnly cookies
            setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

            // Clear tokens from response body - keep only in httpOnly cookie for security
            authResponse.setAccessToken(null);
            authResponse.setRefreshToken(null);

            return ResponseEntity.ok(authResponse);
        } catch (Exception e) { // Intentional broad catch — authentication error boundary
            log.error("MFA login failed", e);
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
            HttpServletRequest request,
            HttpServletResponse response) {

        // SEC (S11-I): Accept EITHER the hardened __Host-hrms-refresh cookie OR the
        // legacy refresh_token cookie. Hardened wins when both are present (browser
        // enforces Secure / Path=/ / no Domain on the __Host- prefix, so it cannot
        // have been planted over plain HTTP or by a sibling subdomain).
        String refreshTokenCookie = readCookieValue(request,
                CookieConfig.REFRESH_TOKEN_COOKIE_HOST,
                CookieConfig.REFRESH_TOKEN_COOKIE);

        // Support both header and cookie (prefer cookie for security)
        String refreshToken = refreshTokenCookie != null ? refreshTokenCookie : refreshTokenHeader;

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        // Call authService.refresh() FIRST to get new tokens, THEN revoke the old token
        AuthResponse authResponse = authService.refresh(refreshToken);

        // Revoke the old refresh token after successful refresh
        tokenProvider.revokeToken(refreshToken);

        // Set new cookies
        setAuthCookies(response, authResponse.getAccessToken(), authResponse.getRefreshToken());

        // Clear tokens from response body - keep only in httpOnly cookie for security
        authResponse.setAccessToken(null);
        authResponse.setRefreshToken(null);

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Revoke tokens and clear authentication state")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request,
            HttpServletResponse response) {

        // SEC (S11-I): Accept EITHER the hardened __Host- cookie OR the legacy
        // unprefixed cookie. Hardened wins when both are present.
        String accessTokenCookie = readCookieValue(request,
                CookieConfig.ACCESS_TOKEN_COOKIE_HOST,
                CookieConfig.ACCESS_TOKEN_COOKIE);
        String refreshTokenCookie = readCookieValue(request,
                CookieConfig.REFRESH_TOKEN_COOKIE_HOST,
                CookieConfig.REFRESH_TOKEN_COOKIE);

        // Extract access token from header or cookie
        String accessToken = accessTokenCookie != null
                ? accessTokenCookie
                : (authHeader != null && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null);

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

    // ==================== Cookie Helper Methods ====================

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

    /**
     * Set secure httpOnly cookies for access and refresh tokens.
     *
     * <p>SEC (S11-I): Dual-emit pattern. Sends BOTH the active variant (legacy or
     * hardened, controlled by {@code app.cookie.use-host-prefix}) and the
     * explicitly hardened {@code __Host-} variant on every successful auth so a
     * production flag-flip is non-breaking: every reader has already been
     * migrated to accept either name, and every writer plants both. Duplicate
     * {@code Set-Cookie} headers with different names are legal and browsers
     * keep them in distinct cookie slots.</p>
     */
    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        // Default-named variant (legacy unless app.cookie.use-host-prefix=true).
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createAccessTokenCookie(accessToken).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createRefreshTokenCookie(refreshToken).toString());
        // Hardened __Host- variant. Safe to emit unconditionally because all readers
        // (JwtAuthenticationFilter, TenantFilter, RateLimitingFilter, this controller)
        // accept either name after S10-J + S11-I.
        addCookieIfPresent(response, cookieConfig.createHardenedAccessTokenCookie(accessToken));
        addCookieIfPresent(response, cookieConfig.createHardenedRefreshTokenCookie(refreshToken));
    }

    /**
     * Clear auth cookies (for logout).
     *
     * <p>SEC (S11-I): Clear BOTH the legacy and hardened names so a logout
     * during the rollover window evicts whichever cookie the browser is
     * holding.</p>
     */
    private void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createClearAccessTokenCookie().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createClearRefreshTokenCookie().toString());
        addCookieIfPresent(response, cookieConfig.createClearHardenedAccessTokenCookie());
        addCookieIfPresent(response, cookieConfig.createClearHardenedRefreshTokenCookie());
    }

    /**
     * Mask a UUID for log output: keeps the first 8 chars (enough to correlate
     * across log lines / traces) and replaces the rest with asterisks. Avoids
     * leaking full user IDs into default log streams while preserving incident
     * forensics.
     */
    private static String mask(UUID id) {
        if (id == null) return "null";
        String s = id.toString();
        return s.substring(0, 8) + "-****";
    }
}
