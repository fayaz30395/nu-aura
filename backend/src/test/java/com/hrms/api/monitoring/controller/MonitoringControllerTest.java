package com.hrms.api.monitoring.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.monitoring.dto.MetricsResponse;
import com.hrms.api.monitoring.dto.SystemHealthResponse;
import com.hrms.api.monitoring.service.MonitoringService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MonitoringController.class)
@ContextConfiguration(classes = {MonitoringController.class, MonitoringControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("MonitoringController Integration Tests")
class MonitoringControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private MonitoringService monitoringService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("System Health Tests")
    class SystemHealthTests {

        @Test
        @DisplayName("Should return system health successfully")
        void shouldReturnSystemHealthSuccessfully() throws Exception {
            SystemHealthResponse health = SystemHealthResponse.builder()
                    .status("UP")
                    .timestamp(Instant.now())
                    .database(SystemHealthResponse.DatabaseHealth.builder()
                            .status("UP")
                            .activeConnections(10)
                            .maxConnections(100)
                            .connectionPoolUsage(0.1)
                            .build())
                    .cache(SystemHealthResponse.CacheHealth.builder()
                            .status("UP")
                            .redisAvailable(true)
                            .build())
                    .jvm(SystemHealthResponse.JvmHealth.builder()
                            .heapUsed(256_000_000L)
                            .heapMax(1_024_000_000L)
                            .heapUsagePercent(25.0)
                            .nonHeapUsed(64_000_000L)
                            .build())
                    .api(SystemHealthResponse.ApiHealth.builder()
                            .totalRequests(50000L)
                            .errorCount(50L)
                            .errorRate(0.001)
                            .avgResponseTime(45.0)
                            .build())
                    .build();

            when(monitoringService.getSystemHealth()).thenReturn(health);

            mockMvc.perform(get("/api/monitoring/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.database.status").value("UP"))
                    .andExpect(jsonPath("$.database.activeConnections").value(10))
                    .andExpect(jsonPath("$.cache.redisAvailable").value(true))
                    .andExpect(jsonPath("$.jvm.heapUsagePercent").value(25.0))
                    .andExpect(jsonPath("$.api.errorRate").value(0.001));

            verify(monitoringService).getSystemHealth();
        }

        @Test
        @DisplayName("Should return degraded health when database is down")
        void shouldReturnDegradedHealthWhenDatabaseDown() throws Exception {
            SystemHealthResponse health = SystemHealthResponse.builder()
                    .status("DEGRADED")
                    .timestamp(Instant.now())
                    .database(SystemHealthResponse.DatabaseHealth.builder()
                            .status("DOWN")
                            .activeConnections(0)
                            .maxConnections(100)
                            .connectionPoolUsage(0.0)
                            .build())
                    .cache(SystemHealthResponse.CacheHealth.builder()
                            .status("UP")
                            .redisAvailable(true)
                            .build())
                    .build();

            when(monitoringService.getSystemHealth()).thenReturn(health);

            mockMvc.perform(get("/api/monitoring/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("DEGRADED"))
                    .andExpect(jsonPath("$.database.status").value("DOWN"));
        }

        @Test
        @DisplayName("Should return health with Redis unavailable")
        void shouldReturnHealthWithRedisUnavailable() throws Exception {
            SystemHealthResponse health = SystemHealthResponse.builder()
                    .status("DEGRADED")
                    .timestamp(Instant.now())
                    .cache(SystemHealthResponse.CacheHealth.builder()
                            .status("DOWN")
                            .redisAvailable(false)
                            .build())
                    .build();

            when(monitoringService.getSystemHealth()).thenReturn(health);

            mockMvc.perform(get("/api/monitoring/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cache.redisAvailable").value(false));
        }
    }

    @Nested
    @DisplayName("Metrics Tests")
    class MetricsTests {

        @Test
        @DisplayName("Should return application metrics successfully")
        void shouldReturnApplicationMetricsSuccessfully() throws Exception {
            MetricsResponse metrics = MetricsResponse.builder()
                    .timestamp(Instant.now())
                    .system(MetricsResponse.SystemMetrics.builder()
                            .activeUsers(150)
                            .uptime(86400L)
                            .cpuUsage(35.5)
                            .totalMemory(4_294_967_296L)
                            .usedMemory(2_147_483_648L)
                            .build())
                    .business(MetricsResponse.BusinessMetrics.builder()
                            .employeeActionsToday(250L)
                            .attendanceEventsToday(180L)
                            .leaveRequestsToday(12L)
                            .payrollProcessedToday(0L)
                            .recruitmentActionsToday(35L)
                            .build())
                    .api(MetricsResponse.ApiMetrics.builder()
                            .totalRequests(100000L)
                            .successfulRequests(99500L)
                            .failedRequests(500L)
                            .errorRate(0.005)
                            .avgResponseTime(42.0)
                            .p95ResponseTime(120.0)
                            .requestsByModule(Map.of("employee", 30000L, "leave", 15000L))
                            .errorsByType(Map.of("400", 300L, "500", 200L))
                            .build())
                    .build();

            when(monitoringService.getMetrics()).thenReturn(metrics);

            mockMvc.perform(get("/api/monitoring/metrics"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.system.activeUsers").value(150))
                    .andExpect(jsonPath("$.system.cpuUsage").value(35.5))
                    .andExpect(jsonPath("$.business.employeeActionsToday").value(250))
                    .andExpect(jsonPath("$.business.leaveRequestsToday").value(12))
                    .andExpect(jsonPath("$.api.totalRequests").value(100000))
                    .andExpect(jsonPath("$.api.errorRate").value(0.005))
                    .andExpect(jsonPath("$.api.p95ResponseTime").value(120.0));

            verify(monitoringService).getMetrics();
        }

        @Test
        @DisplayName("Should return metrics with zero business activity")
        void shouldReturnMetricsWithZeroBusinessActivity() throws Exception {
            MetricsResponse metrics = MetricsResponse.builder()
                    .timestamp(Instant.now())
                    .business(MetricsResponse.BusinessMetrics.builder()
                            .employeeActionsToday(0L)
                            .attendanceEventsToday(0L)
                            .leaveRequestsToday(0L)
                            .payrollProcessedToday(0L)
                            .recruitmentActionsToday(0L)
                            .build())
                    .build();

            when(monitoringService.getMetrics()).thenReturn(metrics);

            mockMvc.perform(get("/api/monitoring/metrics"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.business.employeeActionsToday").value(0))
                    .andExpect(jsonPath("$.business.attendanceEventsToday").value(0));
        }
    }

    @Nested
    @DisplayName("Ping Tests")
    class PingTests {

        @Test
        @DisplayName("Should return pong response")
        void shouldReturnPongResponse() throws Exception {
            mockMvc.perform(get("/api/monitoring/ping"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("pong"));
        }

        @Test
        @DisplayName("Should respond to ping without authentication")
        void shouldRespondToPingWithoutAuthentication() throws Exception {
            // Ping endpoint has no @RequiresPermission, it should be public
            mockMvc.perform(get("/api/monitoring/ping"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("pong"));
        }

        @Test
        @DisplayName("Should return correct content type for ping")
        void shouldReturnCorrectContentTypeForPing() throws Exception {
            mockMvc.perform(get("/api/monitoring/ping"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith("text/plain"));
        }
    }
}
