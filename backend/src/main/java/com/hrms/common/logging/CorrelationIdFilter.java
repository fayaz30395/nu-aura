package com.hrms.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter that adds correlation ID to all requests for distributed tracing.
 *
 * <p>The correlation ID is:</p>
 * <ul>
 *   <li>Extracted from X-Request-ID or X-Correlation-ID header if present</li>
 *   <li>Generated as UUID if not provided</li>
 *   <li>Added to MDC for inclusion in all log statements</li>
 *   <li>Returned in response header for client correlation</li>
 * </ul>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String REQUEST_ID_HEADER = "X-Request-ID";
    public static final String CORRELATION_ID_MDC_KEY = "correlationId";
    public static final String TENANT_ID_MDC_KEY = "tenantId";
    public static final String USER_ID_MDC_KEY = "userId";
    public static final String REQUEST_PATH_MDC_KEY = "requestPath";
    public static final String REQUEST_METHOD_MDC_KEY = "requestMethod";

    /**
     * Get the current correlation ID from MDC.
     * Useful for including in outbound requests.
     */
    public static String getCurrentCorrelationId() {
        return MDC.get(CORRELATION_ID_MDC_KEY);
    }

    /**
     * Set user ID in MDC after authentication.
     * Call this from security filter after user is authenticated.
     */
    public static void setUserId(String userId) {
        if (userId != null) {
            MDC.put(USER_ID_MDC_KEY, userId);
        }
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        try {
            // Extract or generate correlation ID
            String correlationId = extractCorrelationId(request);

            // Add to MDC for logging
            MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
            MDC.put(REQUEST_PATH_MDC_KEY, request.getRequestURI());
            MDC.put(REQUEST_METHOD_MDC_KEY, request.getMethod());

            // Extract tenant ID if present
            String tenantId = request.getHeader("X-Tenant-ID");
            if (tenantId != null && !tenantId.isBlank()) {
                MDC.put(TENANT_ID_MDC_KEY, tenantId);
            }

            // Add correlation ID to response header
            response.setHeader(CORRELATION_ID_HEADER, correlationId);

            filterChain.doFilter(request, response);

        } finally {
            // Clean up MDC to prevent memory leaks
            MDC.remove(CORRELATION_ID_MDC_KEY);
            MDC.remove(TENANT_ID_MDC_KEY);
            MDC.remove(USER_ID_MDC_KEY);
            MDC.remove(REQUEST_PATH_MDC_KEY);
            MDC.remove(REQUEST_METHOD_MDC_KEY);
        }
    }

    private String extractCorrelationId(HttpServletRequest request) {
        // Check for existing correlation ID
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId != null && !correlationId.isBlank()) {
            return correlationId;
        }

        // Check for request ID (alternative header name)
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId != null && !requestId.isBlank()) {
            return requestId;
        }

        // Generate new correlation ID
        return UUID.randomUUID().toString();
    }
}
