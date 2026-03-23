package com.hrms.common.exception;

import com.hrms.common.security.TenantContext;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.persistence.EntityNotFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Global exception handler with structured error tracking.
 *
 * <p><strong>OBSERVABILITY:</strong> All exceptions are logged with:</p>
 * <ul>
 *   <li>Request ID correlation (from MDC)</li>
 *   <li>Tenant context</li>
 *   <li>Error category and type</li>
 *   <li>Micrometer metrics for monitoring</li>
 * </ul>
 */
@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final MeterRegistry meterRegistry;

    /**
     * Track error metrics by category and type.
     */
    private void recordErrorMetric(String category, String type, HttpStatus status) {
        Counter.builder("api.errors")
                .tag("category", category)
                .tag("type", type)
                .tag("status", String.valueOf(status.value()))
                .register(meterRegistry)
                .increment();
    }

    /**
     * Build error response with request tracking information.
     */
    private ErrorResponse buildErrorResponse(HttpStatus status, String error, String message, String path) {
        String requestId = MDC.get("requestId");
        UUID tenantId = TenantContext.getCurrentTenant();

        return ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(error)
                .message(message)
                .path(path)
                .requestId(requestId)
                .tenantId(tenantId != null ? tenantId.toString() : null)
                .build();
    }

    /**
     * Build a ResponseEntity with explicit JSON content type.
     * <p>Prevents HttpMessageNotWritableException when the incoming request
     * has a non-JSON Content-Type (e.g., application/javascript from SockJS transports).</p>
     */
    private ResponseEntity<ErrorResponse> jsonResponse(HttpStatus status, ErrorResponse body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new ResponseEntity<>(body, headers, status);
    }

    /**
     * Check if the request path is a WebSocket/SockJS transport path.
     * <p>SockJS transports (xhr_streaming, xhr_send, eventsource, etc.) use
     * Content-Type: application/javascript which has no compatible message converter.
     * These requests must be excluded from normal error response serialization.</p>
     */
    private boolean isWebSocketTransport(String path) {
        return path != null && (path.startsWith("/ws/") || path.equals("/ws"));
    }

    /**
     * Log error with structured context.
     */
    private void logError(String category, String type, Exception ex, HttpStatus status, String path) {
        String requestId = MDC.get("requestId");
        UUID tenantId = TenantContext.getCurrentTenant();

        log.error("ERROR [{}] category={} type={} status={} path={} tenant={} message={}",
                requestId, category, type, status.value(), path, tenantId, ex.getMessage());

        // For 5xx errors, log full stack trace
        if (status.is5xxServerError()) {
            log.error("Stack trace for request {}", requestId, ex);
        }
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.BAD_REQUEST;

        logError("database", "data_integrity_violation", ex, status, path);
        recordErrorMetric("database", "data_integrity_violation", status);
        // SECURITY: Log the full cause server-side but never expose DB internals to API consumers
        log.error("Data integrity violation detail: {}", ex.getMostSpecificCause().getMessage());

        ErrorResponse errorResponse = buildErrorResponse(status, "Data Integrity Violation",
                "A data conflict occurred. Please check your input and try again.", path);
        errorResponse.setErrorCode("DB_INTEGRITY_VIOLATION");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.BAD_REQUEST;

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        logError("validation", "method_argument_invalid", ex, status, path);
        recordErrorMetric("validation", "method_argument_invalid", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Validation Failed",
                "Invalid input parameters", path);
        errorResponse.setErrors(errors);
        errorResponse.setErrorCode("VALIDATION_FAILED");

        return jsonResponse(status, errorResponse);
    }

    /**
     * CRIT-001 FIX: Handle JPA EntityNotFoundException (thrown by 37+ service methods).
     * Without this handler, these exceptions fall through to the generic Exception handler
     * and return HTTP 500 instead of the correct 404.
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFoundException(
            EntityNotFoundException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.NOT_FOUND;

        logError("resource", "entity_not_found", ex, status, path);
        recordErrorMetric("resource", "entity_not_found", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Not Found", ex.getMessage(), path);
        errorResponse.setErrorCode("ENTITY_NOT_FOUND");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.NOT_FOUND;

        logError("resource", "not_found", ex, status, path);
        recordErrorMetric("resource", "not_found", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Not Found", ex.getMessage(), path);
        errorResponse.setErrorCode("RESOURCE_NOT_FOUND");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentialsException(
            BadCredentialsException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.UNAUTHORIZED;

        logError("auth", "bad_credentials", ex, status, path);
        recordErrorMetric("auth", "bad_credentials", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Unauthorized",
                "Invalid email or password", path);
        errorResponse.setErrorCode("BAD_CREDENTIALS");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.FORBIDDEN;

        logError("auth", "access_denied", ex, status, path);
        recordErrorMetric("auth", "access_denied", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Forbidden",
                "You don't have permission to access this resource", path);
        errorResponse.setErrorCode("ACCESS_DENIED");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            ValidationException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.BAD_REQUEST;

        logError("validation", "validation_error", ex, status, path);
        recordErrorMetric("validation", "validation_error", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Validation Error", ex.getMessage(), path);
        errorResponse.setErrorCode("VALIDATION_ERROR");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.CONFLICT;

        logError("business", "business_rule_violation", ex, status, path);
        recordErrorMetric("business", "business_rule_violation", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Business Rule Violation",
                ex.getMessage(), path);
        errorResponse.setErrorCode("BUSINESS_RULE_VIOLATION");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.UNAUTHORIZED;

        logError("auth", "authentication_failed", ex, status, path);
        recordErrorMetric("auth", "authentication_failed", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Authentication Failed",
                ex.getMessage(), path);
        errorResponse.setErrorCode("AUTHENTICATION_FAILED");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResourceException(
            DuplicateResourceException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.CONFLICT;

        logError("resource", "duplicate_resource", ex, status, path);
        recordErrorMetric("resource", "duplicate_resource", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Duplicate Resource",
                ex.getMessage(), path);
        errorResponse.setErrorCode("DUPLICATE_RESOURCE");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.FORBIDDEN;

        logError("auth", "unauthorized", ex, status, path);
        recordErrorMetric("auth", "unauthorized", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Unauthorized",
                ex.getMessage(), path);
        errorResponse.setErrorCode("UNAUTHORIZED");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.BAD_REQUEST;

        logError("validation", "illegal_argument", ex, status, path);
        recordErrorMetric("validation", "illegal_argument", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Bad Request", ex.getMessage(), path);
        errorResponse.setErrorCode("ILLEGAL_ARGUMENT");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(
            IllegalStateException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.BAD_REQUEST;

        logError("state", "illegal_state", ex, status, path);
        recordErrorMetric("state", "illegal_state", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Invalid State", ex.getMessage(), path);
        errorResponse.setErrorCode("ILLEGAL_STATE");

        return jsonResponse(status, errorResponse);
    }

    /**
     * BUG-004 FIX: Handle invalid UUID path variables (e.g., empty string, malformed UUID).
     * Returns 400 Bad Request instead of 500 Internal Server Error.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatch(
            MethodArgumentTypeMismatchException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.BAD_REQUEST;

        String paramName = ex.getName();
        String requiredType = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String providedValue = ex.getValue() != null ? ex.getValue().toString() : "null";

        String errorMessage = String.format(
            "Invalid value '%s' for parameter '%s'. Expected type: %s",
            providedValue, paramName, requiredType
        );

        logError("validation", "type_mismatch", ex, status, path);
        recordErrorMetric("validation", "type_mismatch", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Invalid Parameter", errorMessage, path);
        errorResponse.setErrorCode("TYPE_MISMATCH");

        Map<String, String> details = new HashMap<>();
        details.put("parameter", paramName);
        details.put("providedValue", providedValue);
        details.put("expectedType", requiredType);
        errorResponse.setErrors(details);

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(FeatureDisabledException.class)
    public ResponseEntity<ErrorResponse> handleFeatureDisabledException(
            FeatureDisabledException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;

        logError("feature", "feature_disabled", ex, status, path);
        recordErrorMetric("feature", "feature_disabled", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Feature Disabled",
                ex.getMessage(), path);
        errorResponse.setErrorCode("FEATURE_DISABLED");

        return jsonResponse(status, errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(
            Exception ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

        // WebSocket/SockJS transports use Content-Type: application/javascript.
        // Returning a JSON ErrorResponse body causes HttpMessageNotWritableException
        // because there is no converter for application/javascript. Return an
        // empty-body response to avoid the cascading serialization failure.
        if (isWebSocketTransport(path)) {
            log.debug("WebSocket transport error on path={}: {}", path, ex.getMessage());
            return ResponseEntity.status(status).build();
        }

        logError("server", "unexpected_error", ex, status, path);
        recordErrorMetric("server", "unexpected_error", status);

        ErrorResponse errorResponse = buildErrorResponse(status, "Internal Server Error",
                "An unexpected error occurred", path);
        errorResponse.setErrorCode("INTERNAL_ERROR");

        return jsonResponse(status, errorResponse);
    }
}
