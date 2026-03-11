package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Global platform statistics for SuperAdmin dashboard
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStatsResponse {
    private long totalTenants;
    private long totalEmployees;
    private long pendingApprovals;
    private long activeUsers;
}
