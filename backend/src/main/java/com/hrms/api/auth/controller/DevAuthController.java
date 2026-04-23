package com.hrms.api.auth.controller;

import com.hrms.api.auth.dto.AuthResponse;
import com.hrms.application.auth.service.AuthService;
import com.hrms.common.config.CookieConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * DEV-ONLY: impersonation endpoint for automated QA loops.
 *
 * Mints a real JWT for any known user by email, bypassing Google OAuth.
 * Gated with {@code @Profile("dev")} — this bean does not load under the
 * {@code prod} profile, so the endpoint simply does not exist in production.
 *
 * No {@code @RequiresPermission} — the endpoint IS the login. It is behind
 * the existing {@code /api/v1/auth/**} permitAll() matcher in SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Profile("dev")
@Slf4j
@Tag(name = "Authentication (dev)", description = "Dev-only auth bypass")
public class DevAuthController {

    private final AuthService authService;
    private final CookieConfig cookieConfig;

    public DevAuthController(AuthService authService, CookieConfig cookieConfig) {
        this.authService = authService;
        this.cookieConfig = cookieConfig;
    }

    public record DevLoginRequest(String email) {}

    @PostMapping("/dev-login")
    @Operation(summary = "DEV-ONLY: mint JWT for a known email (no password, no OAuth)")
    public ResponseEntity<AuthResponse> devLogin(
            @RequestBody DevLoginRequest request,
            HttpServletResponse response) {
        log.warn("DEV-LOGIN: impersonating {} (this endpoint is disabled in prod)", request.email());
        AuthResponse auth = authService.devLogin(request.email());
        response.addHeader(HttpHeaders.SET_COOKIE,
                cookieConfig.createAccessTokenCookie(auth.getAccessToken()).toString());
        response.addHeader(HttpHeaders.SET_COOKIE,
                cookieConfig.createRefreshTokenCookie(auth.getRefreshToken()).toString());
        return ResponseEntity.ok(auth);
    }
}
