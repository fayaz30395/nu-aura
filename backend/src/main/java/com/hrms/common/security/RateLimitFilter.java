package com.hrms.common.security;

import com.hrms.common.config.CookieConfig;
import com.hrms.common.config.DistributedRateLimiter;
import com.hrms.common.config.DistributedRateLimiter.RateLimitResult;
import com.hrms.common.config.DistributedRateLimiter.RateLimitType;
import com.hrms.common.config.RateLimitConfig;
import com.hrms.common.security.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
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
import java.util.UUID;

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
    private final JwtTokenProvider jwtTokenProvider;

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
        return switch (limitType) {
            case AUTH -> {
                boolean allowed = rateLimitConfig.tryConsumeAuth(clientKey);
                long remaining = rateLimitConfig.getAuthRemainingTokens(clientKey);
                yield new RateLimitResult(allowed, remaining, limitType.getWindowSeconds());
            }
            case EXPORT -> {
                boolean allowed = rateLimitConfig.tryConsumeExport(clientKey);
                yield new RateLimitResult(allowed, allowed ? limitType.getLimit() - 1 : 0, limitType.getWindowSeconds());
            }
            case WALL -> {
                boolean allowed = rateLimitConfig.tryConsumeWall(clientKey);
                yield new RateLimitResult(allowed, allowed ? limitType.getLimit() - 1 : 0, limitType.getWindowSeconds());
            }
            case WEBHOOK, UPLOAD, API -> {
                boolean allowed = rateLimitConfig.tryConsumeApi(clientKey);
                yield new RateLimitResult(allowed, allowed ? limitType.getLimit() - 1 : 0, limitType.getWindowSeconds());
            }
        };
    }

    private String resolveClientKey(HttpServletRequest request) {
        // For authenticated requests, use user ID + tenant ID from headers
        String userId = request.getHeader("X-User-ID");
        String tenantId = request.getHeader("X-Tenant-ID");

        if (userId != null && tenantId != null) {
            return tenantId + ":" + userId;
        }

        // DEF-31: Also check access_token cookie for cookie-authenticated users
        // (the frontend uses HttpOnly cookies, not Authorization headers)
        String cookieToken = getJwtFromCookie(request);
        if (cookieToken != null) {
            try {
                UUID cookieUserId = jwtTokenProvider.getUserIdFromToken(cookieToken);
                UUID cookieTenantId = jwtTokenProvider.getTenantIdFromToken(cookieToken);
                if (cookieUserId != null && cookieTenantId != null) {
                    return cookieTenantId + ":" + cookieUserId;
                }
            } catch (RuntimeException e) {
                // Invalid/expired cookie token — fall through to IP-based limiting
                log.debug("Could not extract user from access_token cookie for rate limiting", e);
            }
        }

        // For unauthenticated requests (like login), use IP address
        String clientIp = getClientIP(request);
        return "ip:" + clientIp;
    }

    /**
     * Extract JWT from the access_token cookie (DEF-31).
     */
    private String getJwtFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (CookieConfig.ACCESS_TOKEN_COOKIE.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    /**
     * SEC-005: Use peer IP (getRemoteAddr) as the primary source.
     * X-Forwarded-For is only trusted when the request comes from a known
     * proxy (loopback or private network). An attacker sending a spoofed
     * X-Forwarded-For header directly cannot bypass rate limits.
     */
    private String getClientIP(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();

        // Only trust proxy headers when the immediate peer is a known proxy
        if (isTrustedProxy(remoteAddr)) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.isEmpty()) {
                return xRealIp;
            }
        }

        return remoteAddr;
    }

    private boolean isTrustedProxy(String ip) {
        return ip != null && (
            ip.equals("127.0.0.1") || ip.equals("::1") ||
            ip.startsWith("10.") || ip.startsWith("172.") || ip.startsWith("192.168.")
        );
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
