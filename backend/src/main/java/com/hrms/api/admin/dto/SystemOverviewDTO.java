package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cross-tenant system overview statistics for SuperAdmin mission control
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemOverviewDTO {
    private long totalTenants;
    private long activeTenants;
    private long totalEmployees;
    private long totalActiveUsers;
    private long storageUsageBytes;
    private long aiCreditsUsed;
    private long pendingApprovals;
}
