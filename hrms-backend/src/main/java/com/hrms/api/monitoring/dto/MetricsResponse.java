package com.hrms.api.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * Response DTO for application metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricsResponse {
    private Instant timestamp;
    private SystemMetrics system;
    private BusinessMetrics business;
    private ApiMetrics api;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemMetrics {
        private Integer activeUsers;
        private Long uptime;
        private Double cpuUsage;
        private Long totalMemory;
        private Long usedMemory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BusinessMetrics {
        private Long employeeActionsToday;
        private Long attendanceEventsToday;
        private Long leaveRequestsToday;
        private Long payrollProcessedToday;
        private Long recruitmentActionsToday;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiMetrics {
        private Long totalRequests;
        private Long successfulRequests;
        private Long failedRequests;
        private Double errorRate;
        private Double avgResponseTime;
        private Double p95ResponseTime;
        private Map<String, Long> requestsByModule;
        private Map<String, Long> errorsByType;
    }
}
