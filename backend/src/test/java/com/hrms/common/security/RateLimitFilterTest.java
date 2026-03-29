package com.hrms.common.security;

import com.hrms.common.config.DistributedRateLimiter;
import com.hrms.common.config.DistributedRateLimiter.RateLimitResult;
import com.hrms.common.config.DistributedRateLimiter.RateLimitType;
import com.hrms.common.config.RateLimitConfig;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RateLimitFilter.
 *
 * Tests rate limiting behavior across different endpoint types:
 * - Authentication endpoints (stricter limits)
 * - Export endpoints (resource-intensive)
 * - Wall endpoints (social feed operations)
 * - General API endpoints
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RateLimitFilter Tests")
class RateLimitFilterTest {

    @Mock
    private RateLimitConfig rateLimitConfig;

    @Mock
    private DistributedRateLimiter distributedRateLimiter;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() {
        rateLimitFilter = new RateLimitFilter(rateLimitConfig, distributedRateLimiter);
        // Enable Redis by default
        ReflectionTestUtils.setField(rateLimitFilter, "useRedis", true);
    }

    @Nested
    @DisplayName("Auth Endpoint Rate Limiting Tests")
    class AuthEndpointTests {

        @Test
        @DisplayName("Should apply AUTH rate limit for login endpoint")
        void shouldApplyAuthRateLimitForLogin() throws ServletException, IOException {
            // Given
            String clientIp = "192.168.1.100";
            when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn(clientIp);

            RateLimitResult result = new RateLimitResult(true, 9, 60);
            when(distributedRateLimiter.tryAcquire(contains("ip:"), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(contains("ip:"), eq(RateLimitType.AUTH));
            verify(filterChain).doFilter(request, response);
            verify(response).setHeader("X-RateLimit-Remaining", "9");
        }

        @Test
        @DisplayName("Should apply AUTH rate limit for register endpoint")
        void shouldApplyAuthRateLimitForRegister() throws ServletException, IOException {
            // Given
            String clientIp = "192.168.1.101";
            when(request.getRequestURI()).thenReturn("/api/v1/auth/register");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn(clientIp);

            RateLimitResult result = new RateLimitResult(true, 8, 60);
            when(distributedRateLimiter.tryAcquire(contains("ip:"), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(contains("ip:"), eq(RateLimitType.AUTH));
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("Should apply AUTH rate limit for forgot-password endpoint")
        void shouldApplyAuthRateLimitForForgotPassword() throws ServletException, IOException {
            // Given
            String clientIp = "192.168.1.102";
            when(request.getRequestURI()).thenReturn("/api/v1/auth/forgot-password");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn(clientIp);

            RateLimitResult result = new RateLimitResult(true, 7, 60);
            when(distributedRateLimiter.tryAcquire(contains("ip:"), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(contains("ip:"), eq(RateLimitType.AUTH));
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("Should return 429 when auth rate limit exceeded")
        void shouldReturn429WhenAuthRateLimitExceeded() throws ServletException, IOException {
            // Given
            StringWriter stringWriter = new StringWriter();
            PrintWriter printWriter = new PrintWriter(stringWriter);

            when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn("192.168.1.103");
            when(response.getWriter()).thenReturn(printWriter);

            RateLimitResult result = new RateLimitResult(false, 0, 60);
            when(distributedRateLimiter.tryAcquire(contains("ip:"), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(response).setStatus(429);
            verify(filterChain, never()).doFilter(request, response);
            verify(response).setHeader("X-RateLimit-Remaining", "0");
            verify(response).setHeader("X-RateLimit-Reset", "60");
            verify(response).setHeader("Retry-After", "60");
            String responseBody = stringWriter.toString();
            assertTrue(responseBody.contains("Too many requests"));
        }
    }

    @Nested
    @DisplayName("Export Endpoint Rate Limiting Tests")
    class ExportEndpointTests {

        @Test
        @DisplayName("Should apply EXPORT rate limit for /export endpoints")
        void shouldApplyExportRateLimitForExportEndpoint() throws ServletException, IOException {
            // Given
            String userId = "user-123";
            String tenantId = "tenant-456";
            when(request.getRequestURI()).thenReturn("/api/v1/employees/export");
            when(request.getHeader("X-User-ID")).thenReturn(userId);
            when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);

            RateLimitResult result = new RateLimitResult(true, 4, 300);
            when(distributedRateLimiter.tryAcquire(eq("tenant-456:user-123"), eq(RateLimitType.EXPORT)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(eq("tenant-456:user-123"), eq(RateLimitType.EXPORT));
            verify(filterChain).doFilter(request, response);
            verify(response).setHeader("X-RateLimit-Remaining", "4");
        }

        @Test
        @DisplayName("Should apply EXPORT rate limit for /download endpoints")
        void shouldApplyExportRateLimitForDownloadEndpoint() throws ServletException, IOException {
            // Given
            String userId = "user-789";
            String tenantId = "tenant-012";
            when(request.getRequestURI()).thenReturn("/api/v1/reports/download");
            when(request.getHeader("X-User-ID")).thenReturn(userId);
            when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);

            RateLimitResult result = new RateLimitResult(true, 3, 300);
            when(distributedRateLimiter.tryAcquire(eq("tenant-012:user-789"), eq(RateLimitType.EXPORT)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(eq("tenant-012:user-789"), eq(RateLimitType.EXPORT));
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("Should apply EXPORT rate limit for CSV endpoints")
        void shouldApplyExportRateLimitForCsvEndpoint() throws ServletException, IOException {
            // Given
            String userId = "user-345";
            String tenantId = "tenant-678";
            when(request.getRequestURI()).thenReturn("/api/v1/payroll/export/csv");
            when(request.getHeader("X-User-ID")).thenReturn(userId);
            when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);

            RateLimitResult result = new RateLimitResult(true, 2, 300);
            when(distributedRateLimiter.tryAcquire(eq("tenant-678:user-345"), eq(RateLimitType.EXPORT)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(eq("tenant-678:user-345"), eq(RateLimitType.EXPORT));
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("Should apply EXPORT rate limit for PDF endpoints")
        void shouldApplyExportRateLimitForPdfEndpoint() throws ServletException, IOException {
            // Given
            String userId = "user-901";
            String tenantId = "tenant-234";
            when(request.getRequestURI()).thenReturn("/api/v1/reports/export/pdf");
            when(request.getHeader("X-User-ID")).thenReturn(userId);
            when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);

            RateLimitResult result = new RateLimitResult(true, 1, 300);
            when(distributedRateLimiter.tryAcquire(eq("tenant-234:user-901"), eq(RateLimitType.EXPORT)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(eq("tenant-234:user-901"), eq(RateLimitType.EXPORT));
            verify(filterChain).doFilter(request, response);
        }

        @Test
        @DisplayName("Should return 429 when export rate limit exceeded")
        void shouldReturn429WhenExportRateLimitExceeded() throws ServletException, IOException {
            // Given
            StringWriter stringWriter = new StringWriter();
            PrintWriter printWriter = new PrintWriter(stringWriter);

            when(request.getRequestURI()).thenReturn("/api/v1/employees/export");
            when(request.getHeader("X-User-ID")).thenReturn("user-999");
            when(request.getHeader("X-Tenant-ID")).thenReturn("tenant-888");
            when(response.getWriter()).thenReturn(printWriter);

            RateLimitResult result = new RateLimitResult(false, 0, 300);
            when(distributedRateLimiter.tryAcquire(eq("tenant-888:user-999"), eq(RateLimitType.EXPORT)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(response).setStatus(429);
            verify(response).setHeader("X-RateLimit-Remaining", "0");
            verify(response).setHeader("X-RateLimit-Reset", "300");
            verify(response).setHeader("Retry-After", "300");
            verify(filterChain, never()).doFilter(request, response);
        }
    }

    @Nested
    @DisplayName("Wall Endpoint Rate Limiting Tests")
    class WallEndpointTests {

        @Test
        @DisplayName("Should apply WALL rate limit for wall endpoints")
        void shouldApplyWallRateLimitForWallEndpoint() throws ServletException, IOException {
            // Given
            String userId = "user-111";
            String tenantId = "tenant-222";
            when(request.getRequestURI()).thenReturn("/api/v1/wall/posts");
            when(request.getHeader("X-User-ID")).thenReturn(userId);
            when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);

            RateLimitResult result = new RateLimitResult(true, 29, 60);
            when(distributedRateLimiter.tryAcquire(eq("tenant-222:user-111"), eq(RateLimitType.WALL)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(eq("tenant-222:user-111"), eq(RateLimitType.WALL));
            verify(filterChain).doFilter(request, response);
            verify(response).setHeader("X-RateLimit-Remaining", "29");
        }

        @Test
        @DisplayName("Should return 429 when wall rate limit exceeded")
        void shouldReturn429WhenWallRateLimitExceeded() throws ServletException, IOException {
            // Given
            StringWriter stringWriter = new StringWriter();
            PrintWriter printWriter = new PrintWriter(stringWriter);

            when(request.getRequestURI()).thenReturn("/api/v1/wall/comments");
            when(request.getHeader("X-User-ID")).thenReturn("user-333");
            when(request.getHeader("X-Tenant-ID")).thenReturn("tenant-444");
            when(response.getWriter()).thenReturn(printWriter);

            RateLimitResult result = new RateLimitResult(false, 0, 60);
            when(distributedRateLimiter.tryAcquire(eq("tenant-444:user-333"), eq(RateLimitType.WALL)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(response).setStatus(429);
            verify(filterChain, never()).doFilter(request, response);
        }
    }

    @Nested
    @DisplayName("General API Endpoint Rate Limiting Tests")
    class GeneralApiEndpointTests {

        @Test
        @DisplayName("Should apply API rate limit for general API endpoints")
        void shouldApplyApiRateLimitForGeneralEndpoint() throws ServletException, IOException {
            // Given
            String userId = "user-555";
            String tenantId = "tenant-666";
            when(request.getRequestURI()).thenReturn("/api/v1/employees");
            when(request.getHeader("X-User-ID")).thenReturn(userId);
            when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);

            RateLimitResult result = new RateLimitResult(true, 99, 60);
            when(distributedRateLimiter.tryAcquire(eq("tenant-666:user-555"), eq(RateLimitType.API)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(eq("tenant-666:user-555"), eq(RateLimitType.API));
            verify(filterChain).doFilter(request, response);
            verify(response).setHeader("X-RateLimit-Remaining", "99");
            verify(response).setHeader("X-RateLimit-Limit", "100");
        }

        @Test
        @DisplayName("Should return 429 when API rate limit exceeded")
        void shouldReturn429WhenApiRateLimitExceeded() throws ServletException, IOException {
            // Given
            StringWriter stringWriter = new StringWriter();
            PrintWriter printWriter = new PrintWriter(stringWriter);

            when(request.getRequestURI()).thenReturn("/api/v1/departments");
            when(request.getHeader("X-User-ID")).thenReturn("user-777");
            when(request.getHeader("X-Tenant-ID")).thenReturn("tenant-888");
            when(response.getWriter()).thenReturn(printWriter);

            RateLimitResult result = new RateLimitResult(false, 0, 60);
            when(distributedRateLimiter.tryAcquire(eq("tenant-888:user-777"), eq(RateLimitType.API)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(response).setStatus(429);
            verify(response).setHeader("X-RateLimit-Remaining", "0");
            verify(filterChain, never()).doFilter(request, response);
        }
    }

    @Nested
    @DisplayName("Client Key Resolution Tests")
    class ClientKeyResolutionTests {

        @Test
        @DisplayName("Should resolve client key from user ID and tenant ID when authenticated")
        void shouldResolveClientKeyFromAuthenticatedUser() throws ServletException, IOException {
            // Given
            String userId = "user-auth";
            String tenantId = "tenant-auth";
            when(request.getRequestURI()).thenReturn("/api/v1/employees");
            when(request.getHeader("X-User-ID")).thenReturn(userId);
            when(request.getHeader("X-Tenant-ID")).thenReturn(tenantId);

            RateLimitResult result = new RateLimitResult(true, 99, 60);
            when(distributedRateLimiter.tryAcquire(eq("tenant-auth:user-auth"), eq(RateLimitType.API)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(eq("tenant-auth:user-auth"), eq(RateLimitType.API));
        }

        @Test
        @DisplayName("Should resolve client key from IP address for unauthenticated requests")
        void shouldResolveClientKeyFromIpForUnauthenticated() throws ServletException, IOException {
            // Given
            when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn("192.168.1.200");

            RateLimitResult result = new RateLimitResult(true, 9, 60);
            ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
            when(distributedRateLimiter.tryAcquire(keyCaptor.capture(), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            String capturedKey = keyCaptor.getValue();
            assertTrue(capturedKey.startsWith("ip:"));
            assertTrue(capturedKey.contains("192.168.1.200"));
        }

        @Test
        @DisplayName("Should resolve X-Forwarded-For header for proxy requests")
        void shouldResolveXForwardedForHeader() throws ServletException, IOException {
            // Given - remoteAddr must be a trusted proxy for X-Forwarded-For to be used
            when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.45, 192.0.2.1");
            when(request.getRemoteAddr()).thenReturn("127.0.0.1");

            RateLimitResult result = new RateLimitResult(true, 9, 60);
            ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
            when(distributedRateLimiter.tryAcquire(keyCaptor.capture(), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            String capturedKey = keyCaptor.getValue();
            assertTrue(capturedKey.contains("203.0.113.45"));
        }

        @Test
        @DisplayName("Should resolve X-Real-IP header for nginx proxy requests")
        void shouldResolveXRealIpHeader() throws ServletException, IOException {
            // Given - remoteAddr must be a trusted proxy for X-Real-IP to be used
            when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getHeader("X-Forwarded-For")).thenReturn(null);
            when(request.getHeader("X-Real-IP")).thenReturn("198.51.100.42");
            when(request.getRemoteAddr()).thenReturn("10.0.0.1");

            RateLimitResult result = new RateLimitResult(true, 9, 60);
            ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
            when(distributedRateLimiter.tryAcquire(keyCaptor.capture(), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            String capturedKey = keyCaptor.getValue();
            assertTrue(capturedKey.contains("198.51.100.42"));
        }
    }

    @Nested
    @DisplayName("Endpoint Skip Tests")
    class EndpointSkipTests {

        @Test
        @DisplayName("Should skip rate limiting for actuator endpoints")
        void shouldSkipActuatorEndpoints() throws ServletException, IOException {
            // Given
            when(request.getRequestURI()).thenReturn("/actuator/health");

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(filterChain).doFilter(request, response);
            verify(distributedRateLimiter, never()).tryAcquire(anyString(), any(RateLimitType.class));
        }

        @Test
        @DisplayName("Should skip rate limiting for swagger endpoints")
        void shouldSkipSwaggerEndpoints() throws ServletException, IOException {
            // Given
            when(request.getRequestURI()).thenReturn("/swagger-ui/index.html");

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(filterChain).doFilter(request, response);
            verify(distributedRateLimiter, never()).tryAcquire(anyString(), any(RateLimitType.class));
        }

        @Test
        @DisplayName("Should skip rate limiting for api-docs endpoints")
        void shouldSkipApiDocsEndpoints() throws ServletException, IOException {
            // Given
            when(request.getRequestURI()).thenReturn("/v3/api-docs");

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(filterChain).doFilter(request, response);
            verify(distributedRateLimiter, never()).tryAcquire(anyString(), any(RateLimitType.class));
        }

        @Test
        @DisplayName("Should skip rate limiting for static resources")
        void shouldSkipStaticResources() throws ServletException, IOException {
            // Given
            when(request.getRequestURI()).thenReturn("/static/styles.css");

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(filterChain).doFilter(request, response);
            verify(distributedRateLimiter, never()).tryAcquire(anyString(), any(RateLimitType.class));
        }
    }

    @Nested
    @DisplayName("Webhook Endpoint Rate Limiting Tests")
    class WebhookEndpointTests {

        @Test
        @DisplayName("Should apply WEBHOOK rate limit for webhook endpoints")
        void shouldApplyWebhookRateLimitForWebhookEndpoint() throws ServletException, IOException {
            // Given
            when(request.getRequestURI()).thenReturn("/api/webhooks/events");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn("192.168.1.50");

            RateLimitResult result = new RateLimitResult(true, 49, 60);
            when(distributedRateLimiter.tryAcquire(contains("ip:"), eq(RateLimitType.WEBHOOK)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(distributedRateLimiter).tryAcquire(contains("ip:"), eq(RateLimitType.WEBHOOK));
            verify(filterChain).doFilter(request, response);
        }
    }

    @Nested
    @DisplayName("Response Header Tests")
    class ResponseHeaderTests {

        @Test
        @DisplayName("Should include rate limit headers in response when allowed")
        void shouldIncludeRateLimitHeadersWhenAllowed() throws ServletException, IOException {
            // Given
            when(request.getRequestURI()).thenReturn("/api/v1/employees");
            when(request.getHeader("X-User-ID")).thenReturn("user-123");
            when(request.getHeader("X-Tenant-ID")).thenReturn("tenant-456");

            RateLimitResult result = new RateLimitResult(true, 85, 60);
            when(distributedRateLimiter.tryAcquire(eq("tenant-456:user-123"), eq(RateLimitType.API)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(response).setHeader("X-RateLimit-Remaining", "85");
            verify(response).setHeader("X-RateLimit-Limit", "100");
        }

        @Test
        @DisplayName("Should include retry-after header when rate limited")
        void shouldIncludeRetryAfterHeaderWhenRateLimited() throws ServletException, IOException {
            // Given
            StringWriter stringWriter = new StringWriter();
            PrintWriter printWriter = new PrintWriter(stringWriter);
            when(response.getWriter()).thenReturn(printWriter);

            when(request.getRequestURI()).thenReturn("/api/v1/employees/export");
            when(request.getHeader("X-User-ID")).thenReturn("user-789");
            when(request.getHeader("X-Tenant-ID")).thenReturn("tenant-012");

            RateLimitResult result = new RateLimitResult(false, 0, 300);
            when(distributedRateLimiter.tryAcquire(eq("tenant-012:user-789"), eq(RateLimitType.EXPORT)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(response).setHeader("Retry-After", "300");
        }

        @Test
        @DisplayName("Should set content type to JSON in error response")
        void shouldSetContentTypeToJsonInErrorResponse() throws ServletException, IOException {
            // Given
            StringWriter stringWriter = new StringWriter();
            PrintWriter printWriter = new PrintWriter(stringWriter);
            when(response.getWriter()).thenReturn(printWriter);

            when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn("192.168.1.100");

            RateLimitResult result = new RateLimitResult(false, 0, 60);
            when(distributedRateLimiter.tryAcquire(contains("ip:"), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            verify(response).setContentType("application/json");
        }
    }

    @Nested
    @DisplayName("Error Response Format Tests")
    class ErrorResponseFormatTests {

        @Test
        @DisplayName("Should return properly formatted JSON error response")
        void shouldReturnProperlyFormattedJsonErrorResponse() throws ServletException, IOException {
            // Given
            StringWriter stringWriter = new StringWriter();
            PrintWriter printWriter = new PrintWriter(stringWriter);
            when(response.getWriter()).thenReturn(printWriter);

            when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
            when(request.getHeader("X-User-ID")).thenReturn(null);
            when(request.getHeader("X-Tenant-ID")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn("192.168.1.100");

            RateLimitResult result = new RateLimitResult(false, 0, 60);
            when(distributedRateLimiter.tryAcquire(contains("ip:"), eq(RateLimitType.AUTH)))
                    .thenReturn(result);

            // When
            rateLimitFilter.doFilterInternal(request, response, filterChain);

            // Then
            String responseBody = stringWriter.toString();
            assertTrue(responseBody.contains("\"error\""));
            assertTrue(responseBody.contains("\"message\""));
            assertTrue(responseBody.contains("\"status\":429"));
        }
    }
}
