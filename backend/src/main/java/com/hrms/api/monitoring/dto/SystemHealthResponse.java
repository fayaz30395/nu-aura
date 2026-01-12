package com.hrms.api.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Response DTO for system health status
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemHealthResponse {
    private String status;
    private Instant timestamp;
    private DatabaseHealth database;
    private CacheHealth cache;
    private JvmHealth jvm;
    private ApiHealth api;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DatabaseHealth {
        private String status;
        private Integer activeConnections;
        private Integer maxConnections;
        private Double connectionPoolUsage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CacheHealth {
        private String status;
        private Boolean redisAvailable;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JvmHealth {
        private Long heapUsed;
        private Long heapMax;
        private Double heapUsagePercent;
        private Long nonHeapUsed;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiHealth {
        private Long totalRequests;
        private Long errorCount;
        private Double errorRate;
        private Double avgResponseTime;
    }
}
