package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Deep-dive metrics for a specific tenant
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantMetricsDTO {
    private UUID tenantId;
    private String tenantName;
    private long activeUsers;
    private long totalUsers;
    private long employeeCount;
    private long storageUsageBytes;
    private long pendingApprovals;
    private LocalDateTime lastActivityAt;
    private LocalDateTime createdAt;
}
