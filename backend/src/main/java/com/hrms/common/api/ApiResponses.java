package com.hrms.common.api;

import com.hrms.common.exception.ErrorResponse;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Reusable OpenAPI response annotations for consistent API documentation.
 *
 * <p><strong>Usage:</strong></p>
 * <pre>
 * {@code @GetMapping("/{id}")}
 * {@code @ApiResponses.Success}
 * {@code @ApiResponses.NotFound}
 * {@code @ApiResponses.Unauthorized}
 * public ResponseEntity<EmployeeResponse> getEmployee(@PathVariable UUID id) { ... }
 * </pre>
 */
public final class ApiResponses {

    private ApiResponses() {
    }

    // ========== Success Responses ==========

    /**
     * Standard 200 OK response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "200",
            description = "Request completed successfully"
    )
    public @interface Success {
    }

    /**
     * Standard 201 Created response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "201",
            description = "Resource created successfully"
    )
    public @interface Created {
    }

    /**
     * Standard 204 No Content response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "204",
            description = "Request completed successfully with no content to return"
    )
    public @interface NoContent {
    }

    // ========== Client Error Responses ==========

    /**
     * Standard 400 Bad Request response for validation errors.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "400",
            description = "Invalid request - validation errors or malformed input",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class),
                    examples = @ExampleObject(
                            name = "Validation Error",
                            value = """
                                    {
                                      "timestamp": "2024-02-10T10:30:45",
                                      "status": 400,
                                      "error": "Validation Failed",
                                      "message": "Invalid input parameters",
                                      "errors": {
                                        "email": "must be a valid email address",
                                        "firstName": "must not be blank"
                                      },
                                      "path": "/api/v1/employees",
                                      "requestId": "abc-123-def",
                                      "errorCode": "VALIDATION_FAILED"
                                    }
                                    """
                    )
            )
    )
    public @interface BadRequest {
    }

    /**
     * Standard 401 Unauthorized response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "401",
            description = "Authentication required - missing or invalid credentials",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class),
                    examples = @ExampleObject(
                            name = "Unauthorized",
                            value = """
                                    {
                                      "timestamp": "2024-02-10T10:30:45",
                                      "status": 401,
                                      "error": "Unauthorized",
                                      "message": "Full authentication is required to access this resource",
                                      "path": "/api/v1/employees",
                                      "requestId": "abc-123-def",
                                      "errorCode": "AUTHENTICATION_REQUIRED"
                                    }
                                    """
                    )
            )
    )
    public @interface Unauthorized {
    }

    /**
     * Standard 403 Forbidden response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "403",
            description = "Access denied - insufficient permissions",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class),
                    examples = @ExampleObject(
                            name = "Forbidden",
                            value = """
                                    {
                                      "timestamp": "2024-02-10T10:30:45",
                                      "status": 403,
                                      "error": "Forbidden",
                                      "message": "You don't have permission to access this resource",
                                      "path": "/api/v1/employees",
                                      "requestId": "abc-123-def",
                                      "errorCode": "ACCESS_DENIED"
                                    }
                                    """
                    )
            )
    )
    public @interface Forbidden {
    }

    /**
     * Standard 404 Not Found response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "404",
            description = "Resource not found",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class),
                    examples = @ExampleObject(
                            name = "Not Found",
                            value = """
                                    {
                                      "timestamp": "2024-02-10T10:30:45",
                                      "status": 404,
                                      "error": "Not Found",
                                      "message": "Employee not found with id: 550e8400-e29b-41d4-a716-446655440000",
                                      "path": "/api/v1/employees/550e8400-e29b-41d4-a716-446655440000",
                                      "requestId": "abc-123-def",
                                      "errorCode": "RESOURCE_NOT_FOUND"
                                    }
                                    """
                    )
            )
    )
    public @interface NotFound {
    }

    /**
     * Standard 409 Conflict response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "409",
            description = "Conflict - resource already exists or business rule violation",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class),
                    examples = @ExampleObject(
                            name = "Conflict",
                            value = """
                                    {
                                      "timestamp": "2024-02-10T10:30:45",
                                      "status": 409,
                                      "error": "Duplicate Resource",
                                      "message": "Employee with email john.doe@company.com already exists",
                                      "path": "/api/v1/employees",
                                      "requestId": "abc-123-def",
                                      "errorCode": "DUPLICATE_RESOURCE"
                                    }
                                    """
                    )
            )
    )
    public @interface Conflict {
    }

    /**
     * Standard 429 Too Many Requests response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "429",
            description = "Rate limit exceeded - too many requests",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class),
                    examples = @ExampleObject(
                            name = "Rate Limited",
                            value = """
                                    {
                                      "timestamp": "2024-02-10T10:30:45",
                                      "status": 429,
                                      "error": "Too Many Requests",
                                      "message": "Rate limit exceeded. Please try again later.",
                                      "path": "/api/v1/employees",
                                      "requestId": "abc-123-def",
                                      "errorCode": "RATE_LIMIT_EXCEEDED"
                                    }
                                    """
                    )
            )
    )
    public @interface TooManyRequests {
    }

    // ========== Server Error Responses ==========

    /**
     * Standard 500 Internal Server Error response.
     */
    @Target({ElementType.METHOD, ElementType.TYPE})
    @Retention(RetentionPolicy.RUNTIME)
    @ApiResponse(
            responseCode = "500",
            description = "Internal server error",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class),
                    examples = @ExampleObject(
                            name = "Internal Error",
                            value = """
                                    {
                                      "timestamp": "2024-02-10T10:30:45",
                                      "status": 500,
                                      "error": "Internal Server Error",
                                      "message": "An unexpected error occurred",
                                      "path": "/api/v1/employees",
                                      "requestId": "abc-123-def",
                                      "errorCode": "INTERNAL_ERROR"
                                    }
                                    """
                    )
            )
    )
    public @interface InternalError {
    }

    // ========== Composite Annotations ==========

    /**
     * Standard responses for GET single resource endpoints.
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    @Success
    @NotFound
    @Unauthorized
    @Forbidden
    @InternalError
    public @interface GetOne {
    }

    /**
     * Standard responses for GET list endpoints.
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    @Success
    @BadRequest
    @Unauthorized
    @Forbidden
    @InternalError
    public @interface GetList {
    }

    /**
     * Standard responses for POST create endpoints.
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    @Created
    @BadRequest
    @Unauthorized
    @Forbidden
    @Conflict
    @InternalError
    public @interface Create {
    }

    /**
     * Standard responses for PUT/PATCH update endpoints.
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    @Success
    @BadRequest
    @NotFound
    @Unauthorized
    @Forbidden
    @Conflict
    @InternalError
    public @interface Update {
    }

    /**
     * Standard responses for DELETE endpoints.
     */
    @Target(ElementType.METHOD)
    @Retention(RetentionPolicy.RUNTIME)
    @NoContent
    @NotFound
    @Unauthorized
    @Forbidden
    @InternalError
    public @interface Delete {
    }
}
