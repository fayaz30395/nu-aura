package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Growth metrics for the SuperAdmin System Dashboard.
 * Provides monthly cumulative counts of tenants, employees, and users.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrowthMetricsDTO {

    private List<MonthlyGrowth> months;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyGrowth {
        private String month; // e.g., "Jan", "Feb"
        private int year;
        private long tenants;
        private long activeUsers;
        private long employees;
    }
}
