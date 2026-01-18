package com.hrms.common.security;

import com.hrms.common.config.RateLimitConfig;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate limiting filter that applies different limits based on endpoint type.
 *
 * Playbook Reference: Prompt 14 - Security headers + rate limiting
 *
 * Rate Limits:
 * - Auth endpoints (/api/v1/auth/**): 10 requests/minute per IP
 * - Export endpoints: 5 requests/5 minutes per user
 * - Wall endpoints (/api/v1/wall/**): 30 requests/minute per user
 * - General API: 100 requests/minute per user
 */
@Slf4j
@Component
@Order(1) // Run early in filter chain
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitConfig rateLimitConfig;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String clientKey = resolveClientKey(request);

        boolean allowed = true;
        String limitType = "api";

        // Apply different rate limits based on endpoint
        if (isAuthEndpoint(path)) {
            limitType = "auth";
            allowed = rateLimitConfig.tryConsumeAuth(clientKey);
        } else if (isExportEndpoint(path)) {
            limitType = "export";
            allowed = rateLimitConfig.tryConsumeExport(clientKey);
        } else if (isWallEndpoint(path)) {
            limitType = "wall";
            allowed = rateLimitConfig.tryConsumeWall(clientKey);
        } else if (isApiEndpoint(path)) {
            allowed = rateLimitConfig.tryConsumeApi(clientKey);
        }

        if (!allowed) {
            log.warn("Rate limit exceeded for client: {} on {} endpoint: {}",
                    clientKey, limitType, path);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"error\":\"Too many requests\",\"message\":\"Rate limit exceeded. Please try again later.\",\"status\":429}"
            );
            return;
        }

        // Add rate limit headers
        if (isAuthEndpoint(path)) {
            response.setHeader("X-RateLimit-Remaining",
                String.valueOf(rateLimitConfig.getAuthRemainingTokens(clientKey)));
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientKey(HttpServletRequest request) {
        // For authenticated requests, use user ID + tenant ID
        String userId = request.getHeader("X-User-ID");
        String tenantId = request.getHeader("X-Tenant-ID");

        if (userId != null && tenantId != null) {
            return tenantId + ":" + userId;
        }

        // For unauthenticated requests (like login), use IP address
        String clientIp = getClientIP(request);
        return "ip:" + clientIp;
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    private boolean isAuthEndpoint(String path) {
        return path.startsWith("/api/v1/auth/");
    }

    private boolean isExportEndpoint(String path) {
        return path.contains("/export") ||
               path.contains("/download") ||
               path.endsWith("/csv") ||
               path.endsWith("/pdf");
    }

    private boolean isWallEndpoint(String path) {
        return path.startsWith("/api/v1/wall/");
    }

    private boolean isApiEndpoint(String path) {
        return path.startsWith("/api/");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip rate limiting for actuator, swagger, and static resources
        return path.startsWith("/actuator/") ||
               path.startsWith("/swagger") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/static/");
    }
}
