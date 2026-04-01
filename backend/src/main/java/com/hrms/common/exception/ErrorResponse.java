package com.hrms.common.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Structured error response for API errors.
 *
 * <p>Includes request tracking information for debugging and correlation.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private Map<String, String> errors;
    private String path;

    /** Request ID for correlation with logs */
    private String requestId;

    /** Tenant ID for multi-tenant context */
    private String tenantId;

    /** Error code for programmatic handling (optional) */
    private String errorCode;
}
