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
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
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
            // Set correlation ID
            String correlationId = request.getHeader(CORRELATION_ID_HEADER);
            if (correlationId == null || correlationId.isEmpty()) {
                correlationId = UUID.randomUUID().toString();
            }

            // Add to MDC for structured logging
            MDC.put(MDC_CORRELATION_ID, correlationId);
            MDC.put(MDC_REQUEST_URI, request.getRequestURI());
            MDC.put(MDC_REQUEST_METHOD, request.getMethod());
            MDC.put(MDC_CLIENT_IP, getClientIp(request));

            // Add correlation ID to response header
            response.setHeader(CORRELATION_ID_HEADER, correlationId);

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
