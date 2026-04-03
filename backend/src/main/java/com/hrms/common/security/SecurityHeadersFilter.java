package com.hrms.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter to add security headers to all HTTP responses.
 *
 * <p>Security headers implemented (OWASP compliant):</p>
 * <ul>
 *   <li><strong>X-Content-Type-Options</strong>: Prevents MIME type sniffing</li>
 *   <li><strong>X-Frame-Options</strong>: Prevents clickjacking attacks</li>
 *   <li><strong>X-XSS-Protection</strong>: Disabled in favor of Content-Security-Policy (modern approach)</li>
 *   <li><strong>Strict-Transport-Security</strong>: Enforces HTTPS (HSTS)</li>
 *   <li><strong>Content-Security-Policy</strong>: Restricts content sources</li>
 *   <li><strong>Referrer-Policy</strong>: Controls referrer information sharing</li>
 *   <li><strong>Permissions-Policy</strong>: Controls browser features and permissions</li>
 *   <li><strong>Cache-Control</strong>: Prevents caching of sensitive data</li>
 * </ul>
 */
@Component
@Order(0) // Run before other filters
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Value("${app.security.headers.enabled:true}")
    private boolean headersEnabled;

    @Value("${app.security.hsts.enabled:true}")
    private boolean hstsEnabled;

    @Value("${app.security.hsts.max-age:31536000}")
    private long hstsMaxAge;

    @Value("${app.security.frame-options:DENY}")
    private String frameOptions;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (headersEnabled) {
            // Prevent MIME type sniffing - tells browser to trust Content-Type header
            response.setHeader("X-Content-Type-Options", "nosniff");

            // Prevent clickjacking attacks
            response.setHeader("X-Frame-Options", frameOptions);

            // Disable X-XSS-Protection in favor of CSP (modern approach)
            // Set to 0 to disable browser's built-in XSS protection which can be bypassed
            response.setHeader("X-XSS-Protection", "0");

            // Strict Transport Security (only for HTTPS requests)
            // Forces browser to use HTTPS for all future connections
            if (hstsEnabled && isSecureRequest(request)) {
                response.setHeader("Strict-Transport-Security",
                        "max-age=" + hstsMaxAge + "; includeSubDomains; preload");
            }

            // Content Security Policy - restrict content sources
            // Adjust these values based on your frontend requirements
            response.setHeader("Content-Security-Policy",
                    "default-src 'self'; " +
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                            "style-src 'self' 'unsafe-inline'; " +
                            "img-src 'self' data: https:; " +
                            "font-src 'self' data:; " +
                            "connect-src 'self'; " +
                            "frame-ancestors 'none'; " +
                            "base-uri 'self'; " +
                            "form-action 'self'");

            // Control referrer information - prevents sending referrer to cross-origin sites
            response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

            // Disable unnecessary browser features - controls which browser APIs can be used
            response.setHeader("Permissions-Policy",
                    "geolocation=(), " +
                            "microphone=(), " +
                            "camera=(), " +
                            "payment=(), " +
                            "usb=()");

            // Prevent caching of sensitive API responses
            if (isApiRequest(request) && !isCacheableEndpoint(request)) {
                response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
                response.setHeader("Pragma", "no-cache");
                response.setHeader("Expires", "0");
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        return request.isSecure() ||
                "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
    }

    private boolean isApiRequest(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/");
    }

    private boolean isCacheableEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Allow caching for static-like endpoints
        return path.contains("/static/") ||
                path.contains("/assets/") ||
                path.endsWith(".js") ||
                path.endsWith(".css") ||
                path.endsWith(".png") ||
                path.endsWith(".jpg") ||
                path.endsWith(".ico");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip for WebSocket endpoints
        return path.startsWith("/ws/") || path.startsWith("/websocket/");
    }
}
