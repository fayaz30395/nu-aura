package com.hrms.application.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Employee-related metrics DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeMetrics {
    private long totalEmployees;
    private long activeEmployees;
    private long onLeaveToday;
    private Map<String, Long> departmentDistribution;
    private double attritionRate;
    private long newHiresThisMonth;
}
