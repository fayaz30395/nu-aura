package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tenant summary for SuperAdmin tenant list view
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantListItemDTO {
    private UUID tenantId;
    private String name;
    private String plan;
    private String status;
    private long employeeCount;
    private long userCount;
    private long storageUsageBytes;
    private LocalDateTime createdAt;
    private LocalDateTime lastActivityAt;
}
