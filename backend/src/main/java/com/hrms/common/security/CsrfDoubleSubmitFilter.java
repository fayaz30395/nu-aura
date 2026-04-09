package com.hrms.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Set;

/**
 * CSRF double-submit cookie filter.
 * <p>
 * Defense-in-depth alongside JWT httpOnly cookies with SameSite=Strict.
 * On every request, ensures a non-httpOnly XSRF-TOKEN cookie exists.
 * On state-changing requests (POST/PUT/DELETE/PATCH), validates that
 * the X-XSRF-TOKEN header matches the cookie value.
 * <p>
 * Excluded paths: auth login/refresh/Google OAuth, public endpoints,
 * actuator, webhooks, and API-key-authenticated machine-to-machine calls.
 */
@Component
public class CsrfDoubleSubmitFilter extends OncePerRequestFilter {

    private static final String CSRF_COOKIE_NAME = "XSRF-TOKEN";
    private static final String CSRF_HEADER_NAME = "X-XSRF-TOKEN";
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Always ensure CSRF cookie is set (readable by JS, NOT httpOnly)
        String csrfCookie = getCsrfCookieValue(request);
        if (csrfCookie == null) {
            csrfCookie = generateToken();
            setCsrfCookie(request, response, csrfCookie);
        }

        // Only validate on state-changing methods, and skip validation for excluded paths
        // (auth endpoints, public endpoints) that still need the cookie set
        if (!SAFE_METHODS.contains(request.getMethod().toUpperCase()) && !isValidationExcluded(request)) {
            String headerValue = request.getHeader(CSRF_HEADER_NAME);
            if (csrfCookie == null || headerValue == null || !csrfCookie.equals(headerValue)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"status\":403,\"error\":\"Forbidden\",\"message\":\"CSRF token validation failed\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * BUG-031 FIX: Override shouldNotFilter to only skip CSRF *validation* for
     * excluded paths, but still run the filter so the XSRF-TOKEN cookie is set.
     * The actual validation skip is now handled inside doFilterInternal via
     * isValidationExcluded().
     *
     * Auth endpoints (login, Google OAuth, refresh) are excluded from validation
     * (they need to work without a prior CSRF token) but the filter still runs
     * so that the response includes the XSRF-TOKEN cookie for subsequent requests.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Only skip the filter entirely for non-browser paths that will never
        // need CSRF cookies: webhooks, actuator, WebSocket, SAML, API-key calls.
        return path.startsWith("/actuator/") ||
               path.startsWith("/api/v1/webhooks/") ||
               path.startsWith("/api/v1/integrations/docusign/") ||
               path.startsWith("/api/v1/integrations/slack/") ||
               path.startsWith("/api/v1/payments/webhooks/") ||
               path.startsWith("/api/v1/esignature/external/") ||
               path.startsWith("/api/v1/biometric/") ||
               path.startsWith("/ws/") ||
               path.startsWith("/saml2/") ||
               path.startsWith("/login/saml2/") ||
               path.startsWith("/logout/saml2/") ||
               request.getHeader("X-API-Key") != null;
    }

    /**
     * Check if the request path is excluded from CSRF *validation* but should
     * still receive the XSRF-TOKEN cookie in the response.
     */
    private boolean isValidationExcluded(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/v1/auth/login") ||
               path.startsWith("/api/v1/auth/google") ||
               path.startsWith("/api/v1/auth/refresh") ||
               path.startsWith("/api/v1/auth/mfa-login") ||
               path.startsWith("/api/v1/auth/forgot-password") ||
               path.startsWith("/api/v1/auth/reset-password") ||
               path.startsWith("/api/v1/public/") ||
               path.startsWith("/api/public/") ||
               path.startsWith("/api/v1/exit/interview/public/") ||
               path.startsWith("/api/v1/preboarding/portal/") ||
               path.startsWith("/api/v1/tenants/register");
    }

    private void setCsrfCookie(HttpServletRequest request, HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(CSRF_COOKIE_NAME, token);
        cookie.setPath("/");
        cookie.setHttpOnly(false); // Must be readable by JavaScript
        cookie.setSecure(request.isSecure());
        cookie.setMaxAge(-1); // Session cookie
        response.addCookie(cookie);
    }

    private String getCsrfCookieValue(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (CSRF_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
