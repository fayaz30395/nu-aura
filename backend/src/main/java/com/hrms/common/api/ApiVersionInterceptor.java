package com.hrms.common.api;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Interceptor for API versioning and deprecation handling.
 *
 * <p><strong>Responsibilities:</strong></p>
 * <ul>
 *   <li>Adds X-API-Version header to all API responses</li>
 *   <li>Adds X-API-Latest-Version header for client upgrade awareness</li>
 *   <li>Handles @Deprecated annotation to add deprecation headers</li>
 *   <li>Logs deprecation warnings for monitoring</li>
 *   <li>Records metrics for deprecated endpoint usage</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiVersionInterceptor implements HandlerInterceptor {

    private final MeterRegistry meterRegistry;

    // RFC 7231 date format for Sunset header
    private static final DateTimeFormatter RFC_7231_FORMAT =
            DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) {

        // Add version headers to all API responses
        if (request.getRequestURI().startsWith("/api/")) {
            response.setHeader(ApiVersion.HEADER_API_VERSION, ApiVersion.CURRENT);
            response.setHeader(ApiVersion.HEADER_API_LATEST_VERSION, ApiVersion.CURRENT);
        }

        // Check for deprecated endpoints
        if (handler instanceof HandlerMethod handlerMethod) {
            handleDeprecation(handlerMethod, request, response);
        }

        return true;
    }

    private void handleDeprecation(HandlerMethod handlerMethod, HttpServletRequest request,
                                   HttpServletResponse response) {
        // Check method-level deprecation first, then class-level
        Deprecated deprecated = handlerMethod.getMethodAnnotation(Deprecated.class);
        if (deprecated == null) {
            deprecated = handlerMethod.getBeanType().getAnnotation(Deprecated.class);
        }

        if (deprecated == null) {
            return;
        }

        // Add deprecation headers
        response.setHeader(ApiVersion.HEADER_API_DEPRECATED, "true");
        response.setHeader(ApiVersion.HEADER_API_DEPRECATION_NOTICE, buildDeprecationNotice(deprecated));

        // Add Sunset header if date is specified
        if (!deprecated.sunset().isBlank()) {
            try {
                LocalDate sunsetDate = LocalDate.parse(deprecated.sunset());
                String sunsetHeader = sunsetDate.atStartOfDay(ZoneOffset.UTC)
                        .format(RFC_7231_FORMAT);
                response.setHeader(ApiVersion.HEADER_API_SUNSET, sunsetHeader);
            } catch (DateTimeParseException e) {
                log.warn("Invalid sunset date format for deprecated endpoint: {}", deprecated.sunset());
            }
        }

        // Log warning if enabled
        if (deprecated.logWarning()) {
            logDeprecationWarning(handlerMethod, request, deprecated);
        }

        // Record metrics
        recordDeprecationMetric(handlerMethod, request);
    }

    private String buildDeprecationNotice(Deprecated deprecated) {
        StringBuilder notice = new StringBuilder(deprecated.message());

        if (!deprecated.replacement().isBlank()) {
            notice.append(" Please migrate to: ").append(deprecated.replacement());
        }

        if (!deprecated.sunset().isBlank()) {
            notice.append(" This endpoint will be removed after ").append(deprecated.sunset()).append(".");
        }

        return notice.toString();
    }

    private void logDeprecationWarning(HandlerMethod handlerMethod, HttpServletRequest request,
                                       Deprecated deprecated) {
        String endpoint = request.getMethod() + " " + request.getRequestURI();
        String controller = handlerMethod.getBeanType().getSimpleName();
        String method = handlerMethod.getMethod().getName();

        log.warn("DEPRECATED_API_CALL endpoint={} controller={}.{} deprecated_since={} sunset={} replacement={}",
                endpoint, controller, method, deprecated.since(),
                deprecated.sunset().isBlank() ? "N/A" : deprecated.sunset(),
                deprecated.replacement().isBlank() ? "N/A" : deprecated.replacement());
    }

    private void recordDeprecationMetric(HandlerMethod handlerMethod, HttpServletRequest request) {
        Counter.builder("api.deprecated.calls")
                .tag("endpoint", request.getRequestURI())
                .tag("method", request.getMethod())
                .tag("controller", handlerMethod.getBeanType().getSimpleName())
                .register(meterRegistry)
                .increment();
    }
}
