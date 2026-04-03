package com.hrms.common.logging;

import com.hrms.common.security.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter that logs all HTTP requests with structured data.
 * Adds correlation ID, tenant ID, and request metadata to MDC for structured logging.
 *
 * <p><strong>Request Tracing:</strong> Supports both X-Request-ID (industry standard)
 * and X-Correlation-ID headers. If neither is provided, generates a new UUID.</p>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String MDC_REQUEST_ID = "requestId";
    private static final String MDC_CORRELATION_ID = "correlationId";
    private static final String MDC_TENANT_ID = "tenantId";
    private static final String MDC_USER_ID = "userId";
    private static final String MDC_REQUEST_URI = "requestUri";
    private static final String MDC_REQUEST_METHOD = "requestMethod";
    private static final String MDC_CLIENT_IP = "clientIp";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        long startTime = System.currentTimeMillis();

        try {
            // Get request ID from headers (prefer X-Request-ID, fallback to X-Correlation-ID)
            String requestId = request.getHeader(REQUEST_ID_HEADER);
            if (requestId == null || requestId.isEmpty()) {
                requestId = request.getHeader(CORRELATION_ID_HEADER);
            }
            if (requestId == null || requestId.isEmpty()) {
                requestId = UUID.randomUUID().toString();
            }

            // Add to MDC for structured logging (use both keys for compatibility)
            MDC.put(MDC_REQUEST_ID, requestId);
            MDC.put(MDC_CORRELATION_ID, requestId);
            MDC.put(MDC_REQUEST_URI, request.getRequestURI());
            MDC.put(MDC_REQUEST_METHOD, request.getMethod());
            MDC.put(MDC_CLIENT_IP, getClientIp(request));

            // Add request ID to response headers (both for compatibility)
            response.setHeader(REQUEST_ID_HEADER, requestId);
            response.setHeader(CORRELATION_ID_HEADER, requestId);

            // Log request start
            if (shouldLog(request)) {
                log.info("Request started: {} {}", request.getMethod(), request.getRequestURI());
            }

            filterChain.doFilter(request, response);

        } finally {
            // Add tenant context if available
            UUID tenantId = TenantContext.getCurrentTenant();
            if (tenantId != null) {
                MDC.put(MDC_TENANT_ID, tenantId.toString());
            }

            long duration = System.currentTimeMillis() - startTime;

            // Log request completion
            if (shouldLog(request)) {
                log.info("Request completed: {} {} - Status: {} - Duration: {}ms",
                        request.getMethod(),
                        request.getRequestURI(),
                        response.getStatus(),
                        duration);
            }

            // Clear MDC
            MDC.clear();
        }
    }

    private boolean shouldLog(HttpServletRequest request) {
        String uri = request.getRequestURI();
        // Skip health checks and actuator endpoints for cleaner logs
        return !uri.startsWith("/actuator") &&
                !uri.equals("/health") &&
                !uri.endsWith("/favicon.ico");
    }

    private String getClientIp(HttpServletRequest request) {
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
}
