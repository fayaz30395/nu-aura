package com.hrms.application.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight summary DTO for the main dashboard KPI cards.
 * Returns only the top-level numbers needed for the overview widget.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsSummary {
    private long totalEmployees;
    private long presentToday;
    private long onLeaveToday;
    private long pendingApprovals;
    private boolean payrollProcessedThisMonth;
    private long openPositions;
}
