package com.hrms.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.ResponseCookie;

/**
 * Configuration for secure cookie handling using ResponseCookie (supports SameSite natively).
 * <p>
 * Security properties:
 * - HttpOnly: Prevents JavaScript access (XSS protection)
 * - Secure: Only transmitted over HTTPS (in production)
 * - SameSite=Strict: Prevents CSRF attacks
 * - Path=/: Cookie available for all endpoints
 */
@Configuration
public class CookieConfig {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";
    public static final String CSRF_TOKEN_COOKIE = "XSRF-TOKEN";

    @Value("${app.cookie.secure:true}")
    private boolean secureCookie;

    @Value("${app.cookie.domain:}")
    private String cookieDomain;

    @Value("${app.jwt.expiration:3600000}")
    private long accessTokenExpiration;

    @Value("${app.jwt.refresh-expiration:86400000}")
    private long refreshTokenExpiration;

    /**
     * Create a secure httpOnly ResponseCookie for the access token.
     * Uses ResponseCookie which natively supports SameSite attribute.
     */
    public ResponseCookie createAccessTokenCookie(String token) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(ACCESS_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(secureCookie)
                .path("/")
                .maxAge(accessTokenExpiration / 1000) // Convert ms to seconds
                .sameSite("Strict");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return builder.build();
    }

    /**
     * Create a secure httpOnly ResponseCookie for the refresh token.
     * Uses ResponseCookie which natively supports SameSite attribute.
     */
    public ResponseCookie createRefreshTokenCookie(String token) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(secureCookie)
                .path("/") // Sent to all endpoints for token refresh support
                .maxAge(refreshTokenExpiration / 1000)
                .sameSite("Strict");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return builder.build();
    }

    /**
     * Create a cookie to clear the access token (for logout).
     */
    public ResponseCookie createClearAccessTokenCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(secureCookie)
                .path("/")
                .maxAge(0) // Immediately expire
                .sameSite("Strict");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return builder.build();
    }

    /**
     * Create a cookie to clear the refresh token (for logout).
     */
    public ResponseCookie createClearRefreshTokenCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(secureCookie)
                .path("/")
                .maxAge(0)
                .sameSite("Strict");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            builder.domain(cookieDomain);
        }
        return builder.build();
    }

    public boolean isSecureCookie() {
        return secureCookie;
    }
}
