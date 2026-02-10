package com.hrms.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for secure cookie handling.
 *
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
     * Create a secure httpOnly cookie for the access token.
     */
    public jakarta.servlet.http.Cookie createAccessTokenCookie(String token) {
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(ACCESS_TOKEN_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/");
        cookie.setMaxAge((int) (accessTokenExpiration / 1000)); // Convert ms to seconds
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }
        // Note: SameSite is set via response header as Cookie API doesn't support it directly
        return cookie;
    }

    /**
     * Create a secure httpOnly cookie for the refresh token.
     */
    public jakarta.servlet.http.Cookie createRefreshTokenCookie(String token) {
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(REFRESH_TOKEN_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/api/v1/auth"); // Only sent to auth endpoints
        cookie.setMaxAge((int) (refreshTokenExpiration / 1000));
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }
        return cookie;
    }

    /**
     * Create a cookie to clear the access token (for logout).
     */
    public jakarta.servlet.http.Cookie createClearAccessTokenCookie() {
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(ACCESS_TOKEN_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/");
        cookie.setMaxAge(0); // Immediately expire
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }
        return cookie;
    }

    /**
     * Create a cookie to clear the refresh token (for logout).
     */
    public jakarta.servlet.http.Cookie createClearRefreshTokenCookie() {
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(REFRESH_TOKEN_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(0);
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }
        return cookie;
    }

    /**
     * Add SameSite attribute to response.
     * This must be done via header because the Cookie API doesn't support SameSite.
     */
    public void addSameSiteAttribute(jakarta.servlet.http.HttpServletResponse response, String cookieName, String sameSite) {
        String header = response.getHeader("Set-Cookie");
        if (header != null && header.contains(cookieName)) {
            response.setHeader("Set-Cookie", header + "; SameSite=" + sameSite);
        }
    }

    public boolean isSecureCookie() {
        return secureCookie;
    }
}
