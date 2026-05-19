package com.nulogic.common.api.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Standard success envelope wrapping all controller responses opted-in via
 * {@link WrapResponse}.
 *
 * <p>Shape:
 * <pre>
 * {
 *   "data": &lt;payload&gt;,
 *   "meta": { ... optional, e.g. pagination ... },
 *   "traceId": "abc-123",   // from MDC if present
 *   "serverTime": "2026-05-20T10:30:45Z"
 * }
 * </pre>
 *
 * <p>Errors continue to flow through
 * {@link com.nulogic.common.exception.GlobalExceptionHandler} and use
 * {@link com.nulogic.common.exception.ErrorResponse} — they are NOT wrapped.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        T data,
        Map<String, Object> meta,
        String traceId,
        Instant serverTime
) {

    /**
     * Wrap a payload with no meta. Convenience for endpoints that don't paginate.
     */
    public static <T> ApiResponse<T> of(T data, String traceId) {
        return new ApiResponse<>(data, null, traceId, Instant.now());
    }

    /**
     * Wrap a payload with caller-supplied meta (e.g. pagination).
     */
    public static <T> ApiResponse<T> of(T data, Map<String, Object> meta, String traceId) {
        return new ApiResponse<>(data, meta, traceId, Instant.now());
    }
}
