package com.hrms.common.exception;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link GlobalExceptionHandler}.
 *
 * <p>Covers HTTP status codes, error codes set on {@link ErrorResponse},
 * the {@link MaxUploadSizeExceededException} → 413 mapping added in LOW-4,
 * and the WebSocket path bypass added to avoid
 * {@code HttpMessageNotWritableException} on SockJS transports.
 *
 * <p>Uses a real {@link SimpleMeterRegistry} so Micrometer counter calls
 * run without needing full mocking.
 */
@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("GlobalExceptionHandler Tests")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private WebRequest webRequest;

    @BeforeEach
    void setUp() {
        MeterRegistry meterRegistry = new SimpleMeterRegistry();
        handler = new GlobalExceptionHandler(meterRegistry);
        webRequest = mock(WebRequest.class);
        when(webRequest.getDescription(false)).thenReturn("uri=/api/v1/test");
    }

    // -----------------------------------------------------------------------
    // LOW-4 FIX: MaxUploadSizeExceededException → 413 PAYLOAD_TOO_LARGE
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("MaxUploadSizeExceededException → 413 (LOW-4)")
    class MaxUploadSizeTests {

        @Test
        @DisplayName("Returns HTTP 413 PAYLOAD_TOO_LARGE")
        void returns413Status() {
            MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(5 * 1024 * 1024L);

            ResponseEntity<ErrorResponse> response = handler.handleMaxUploadSize(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        }

        @Test
        @DisplayName("Response body has errorCode FILE_TOO_LARGE")
        void responseBodyHasFileTooLargeErrorCode() {
            MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(5 * 1024 * 1024L);

            ResponseEntity<ErrorResponse> response = handler.handleMaxUploadSize(ex, webRequest);

            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getErrorCode()).isEqualTo("FILE_TOO_LARGE");
        }

        @Test
        @DisplayName("Response body status field matches HTTP status integer 413")
        void responseBodyStatusMatchesHttpStatus() {
            MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(1L);

            ResponseEntity<ErrorResponse> response = handler.handleMaxUploadSize(ex, webRequest);

            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getStatus()).isEqualTo(413);
        }

        @Test
        @DisplayName("Response body includes non-blank message")
        void responseBodyIncludesMessage() {
            MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(1L);

            ResponseEntity<ErrorResponse> response = handler.handleMaxUploadSize(ex, webRequest);

            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getMessage()).isNotBlank();
        }

        @Test
        @DisplayName("Response body includes path")
        void responseBodyIncludesPath() {
            MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(1L);

            ResponseEntity<ErrorResponse> response = handler.handleMaxUploadSize(ex, webRequest);

            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getPath()).isEqualTo("/api/v1/test");
        }

        @Test
        @DisplayName("Response Content-Type header is application/json")
        void responseContentTypeIsJson() {
            MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(1L);

            ResponseEntity<ErrorResponse> response = handler.handleMaxUploadSize(ex, webRequest);

            assertThat(response.getHeaders().getContentType())
                    .isNotNull()
                    .hasToString("application/json");
        }
    }

    // -----------------------------------------------------------------------
    // Existing handlers — spot-check status codes and error codes
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("AccessDeniedException → 403")
    class AccessDeniedTests {

        @Test
        @DisplayName("Returns HTTP 403 FORBIDDEN")
        void returns403Status() {
            AccessDeniedException ex = new AccessDeniedException("no access");

            ResponseEntity<ErrorResponse> response = handler.handleAccessDeniedException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getErrorCode()).isEqualTo("ACCESS_DENIED");
        }
    }

    @Nested
    @DisplayName("BadCredentialsException → 401")
    class BadCredentialsTests {

        @Test
        @DisplayName("Returns HTTP 401 UNAUTHORIZED")
        void returns401Status() {
            BadCredentialsException ex = new BadCredentialsException("bad creds");

            ResponseEntity<ErrorResponse> response = handler.handleBadCredentialsException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getErrorCode()).isEqualTo("BAD_CREDENTIALS");
        }
    }

    @Nested
    @DisplayName("ResourceNotFoundException → 404")
    class ResourceNotFoundTests {

        @Test
        @DisplayName("Returns HTTP 404 NOT_FOUND")
        void returns404Status() {
            ResourceNotFoundException ex = new ResourceNotFoundException("Employee not found");

            ResponseEntity<ErrorResponse> response =
                    handler.handleResourceNotFoundException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getErrorCode()).isEqualTo("RESOURCE_NOT_FOUND");
            assertThat(response.getBody().getMessage()).isEqualTo("Employee not found");
        }
    }

    @Nested
    @DisplayName("IllegalArgumentException → 400")
    class IllegalArgumentTests {

        @Test
        @DisplayName("Returns HTTP 400 BAD_REQUEST")
        void returns400Status() {
            IllegalArgumentException ex = new IllegalArgumentException("bad input");

            ResponseEntity<ErrorResponse> response =
                    handler.handleIllegalArgumentException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getErrorCode()).isEqualTo("ILLEGAL_ARGUMENT");
        }
    }

    @Nested
    @DisplayName("BusinessException → 409")
    class BusinessExceptionTests {

        @Test
        @DisplayName("Returns HTTP 409 CONFLICT")
        void returns409Status() {
            BusinessException ex = new BusinessException("duplicate entry");

            ResponseEntity<ErrorResponse> response = handler.handleBusinessException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getErrorCode()).isEqualTo("BUSINESS_RULE_VIOLATION");
        }
    }

    @Nested
    @DisplayName("Generic Exception → 500 (with WebSocket bypass)")
    class GenericExceptionTests {

        @Test
        @DisplayName("Non-WebSocket path returns 500 INTERNAL_SERVER_ERROR with body")
        void nonWebSocketPathReturns500WithBody() {
            RuntimeException ex = new RuntimeException("unexpected");

            ResponseEntity<ErrorResponse> response = handler.handleGlobalException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getErrorCode()).isEqualTo("INTERNAL_ERROR");
        }

        @Test
        @DisplayName("WebSocket transport path returns 500 with no body")
        void webSocketTransportPathReturns500WithoutBody() {
            WebRequest wsRequest = mock(WebRequest.class);
            when(wsRequest.getDescription(false)).thenReturn("uri=/ws/info");

            RuntimeException ex = new RuntimeException("ws error");

            ResponseEntity<ErrorResponse> response = handler.handleGlobalException(ex, wsRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            assertThat(response.getBody()).isNull();
        }
    }

    // -----------------------------------------------------------------------
    // ErrorResponse DTO structure contract
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("ErrorResponse DTO structure contract")
    class ErrorResponseStructureTests {

        @Test
        @DisplayName("ErrorResponse has timestamp, status, error, message, path, errorCode fields")
        void errorResponseHasAllRequiredFields() {
            MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(1L);

            ResponseEntity<ErrorResponse> response = handler.handleMaxUploadSize(ex, webRequest);
            ErrorResponse body = response.getBody();

            assertThat(body).isNotNull();
            assertThat(body.getTimestamp()).isNotNull();
            assertThat(body.getStatus()).isPositive();
            assertThat(body.getError()).isNotBlank();
            assertThat(body.getMessage()).isNotBlank();
            assertThat(body.getPath()).isNotBlank();
            assertThat(body.getErrorCode()).isNotBlank();
        }
    }
}
