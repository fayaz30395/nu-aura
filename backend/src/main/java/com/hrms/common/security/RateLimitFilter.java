package com.hrms.common.security;

import com.hrms.common.config.DistributedRateLimiter;
import com.hrms.common.config.DistributedRateLimiter.RateLimitResult;
import com.hrms.common.config.DistributedRateLimiter.RateLimitType;
import com.hrms.common.config.RateLimitConfig;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate limiting filter that applies different limits based on endpoint type.
 *
 * <p><strong>DISTRIBUTED:</strong> Uses Redis-backed rate limiting for multi-instance
 * deployments, with fallback to in-memory limiting if Redis is unavailable.</p>
 *
 * <p>Rate Limits:</p>
 * <ul>
 *   <li>Auth endpoints (/api/v1/auth/**): 10 requests/minute per IP</li>
 *   <li>Export endpoints: 5 requests/5 minutes per user</li>
 *   <li>Wall endpoints (/api/v1/wall/**): 30 requests/minute per user</li>
 *   <li>General API: 100 requests/minute per user</li>
 * </ul>
 */
@Slf4j
@Component
@Order(1) // Run early in filter chain
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitConfig rateLimitConfig;
    private final DistributedRateLimiter distributedRateLimiter;

    @Value("${app.rate-limit.use-redis:true}")
    private boolean useRedis;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String clientKey = resolveClientKey(request);

        RateLimitResult result;
        RateLimitType limitType;

        // Determine rate limit type based on endpoint
        if (isAuthEndpoint(path)) {
            limitType = RateLimitType.AUTH;
        } else if (isExportEndpoint(path)) {
            limitType = RateLimitType.EXPORT;
        } else if (isWallEndpoint(path)) {
            limitType = RateLimitType.WALL;
        } else if (isWebhookEndpoint(path)) {
            limitType = RateLimitType.WEBHOOK;
        } else if (isApiEndpoint(path)) {
            limitType = RateLimitType.API;
        } else {
            // Non-API endpoints - allow without rate limiting
            filterChain.doFilter(request, response);
            return;
        }

        // Use distributed (Redis) or in-memory rate limiting
        if (useRedis) {
            result = distributedRateLimiter.tryAcquire(clientKey, limitType);
        } else {
            // Fallback to in-memory rate limiting
            result = tryConsumeInMemory(clientKey, limitType);
        }

        if (!result.allowed()) {
            log.warn("Rate limit exceeded for client: {} on {} endpoint: {}",
                    clientKey, limitType, path);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setHeader("X-RateLimit-Reset", String.valueOf(result.resetSeconds()));
            response.setHeader("Retry-After", String.valueOf(result.resetSeconds()));
            response.getWriter().write(
                "{\"error\":\"Too many requests\",\"message\":\"Rate limit exceeded. Please try again later.\",\"status\":429}"
            );
            return;
        }

        // Add rate limit headers
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remainingTokens()));
        response.setHeader("X-RateLimit-Limit", String.valueOf(limitType.getLimit()));

        filterChain.doFilter(request, response);
    }

    /**
     * Fallback to in-memory rate limiting when Redis is unavailable.
     */
    private RateLimitResult tryConsumeInMemory(String clientKey, RateLimitType limitType) {
        boolean allowed;
        long remaining;

        switch (limitType) {
            case AUTH:
                allowed = rateLimitConfig.tryConsumeAuth(clientKey);
                remaining = rateLimitConfig.getAuthRemainingTokens(clientKey);
                break;
            case EXPORT:
                allowed = rateLimitConfig.tryConsumeExport(clientKey);
                remaining = allowed ? limitType.getLimit() - 1 : 0;
                break;
            case WALL:
                allowed = rateLimitConfig.tryConsumeWall(clientKey);
                remaining = allowed ? limitType.getLimit() - 1 : 0;
                break;
            case WEBHOOK:
                allowed = rateLimitConfig.tryConsumeApi(clientKey); // Use API bucket for webhook fallback
                remaining = allowed ? limitType.getLimit() - 1 : 0;
                break;
            case API:
            default:
                allowed = rateLimitConfig.tryConsumeApi(clientKey);
                remaining = allowed ? limitType.getLimit() - 1 : 0;
                break;
        }

        return new RateLimitResult(allowed, remaining, limitType.getWindowSeconds());
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

    private boolean isWebhookEndpoint(String path) {
        return path.startsWith("/api/webhooks");
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
