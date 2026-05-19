package com.nulogic.common.api.response;

import com.nulogic.common.exception.ErrorResponse;
import org.slf4j.MDC;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.List;

/**
 * Wraps controller response bodies into {@link ApiResponse} when the
 * declaring class or handler method is annotated {@link WrapResponse}.
 *
 * <p>Hard skip rules (so the wrapper is safe to switch on globally):
 * <ul>
 *   <li>Body is already an {@link ApiResponse} (idempotent).</li>
 *   <li>Body is an {@link ErrorResponse} — error envelope owned by
 *       {@code GlobalExceptionHandler} stays intact.</li>
 *   <li>Streaming/SSE return types ({@link ResponseBodyEmitter},
 *       {@link SseEmitter}, {@link StreamingResponseBody}).</li>
 *   <li>Non-JSON content (e.g. {@code text/csv}, binary).</li>
 * </ul>
 *
 * <p>Trace id is pulled from MDC — first {@code traceId}, falling back to
 * {@code requestId} / {@code correlationId} (see
 * {@code RequestLoggingFilter} + {@code CorrelationIdFilter}).
 */
@RestControllerAdvice
public class ApiResponseBodyAdvice implements ResponseBodyAdvice<Object> {

    private static final List<String> MDC_TRACE_KEYS = List.of("traceId", "requestId", "correlationId");

    private static final List<Class<?>> STREAMING_TYPES = List.of(
            ResponseBodyEmitter.class,
            SseEmitter.class,
            StreamingResponseBody.class
    );

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        if (returnType == null || returnType.getMethod() == null) {
            return false;
        }
        Class<?> declaringClass = returnType.getContainingClass();
        boolean optedIn = declaringClass.isAnnotationPresent(WrapResponse.class)
                || returnType.hasMethodAnnotation(WrapResponse.class);
        if (!optedIn) {
            return false;
        }
        Class<?> raw = returnType.getParameterType();
        for (Class<?> streaming : STREAMING_TYPES) {
            if (streaming.isAssignableFrom(raw)) {
                return false;
            }
        }
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request,
                                  ServerHttpResponse response) {
        if (body instanceof ApiResponse<?>) {
            return body;
        }
        if (body instanceof ErrorResponse) {
            return body;
        }
        if (selectedContentType != null
                && !MediaType.APPLICATION_JSON.includes(selectedContentType)
                && !"+json".equalsIgnoreCase(selectedContentType.getSubtypeSuffix())) {
            return body;
        }
        String traceId = resolveTraceId();
        // body may be null (e.g. void / 204) — still wrap so consumers see a
        // consistent shape with a populated traceId.
        return ApiResponse.of(body, traceId);
    }

    private String resolveTraceId() {
        for (String key : MDC_TRACE_KEYS) {
            String value = MDC.get(key);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
