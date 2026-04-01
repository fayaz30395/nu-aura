package com.hrms.application.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Leave-related metrics DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveMetrics {
    private long pendingRequests;
    private long approvedThisMonth;
    private long rejectedThisMonth;
    private Map<String, Long> leaveTypeDistribution;
    private long employeesOnLeaveToday;
}
