package com.hrms.api.probation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProbationStatisticsResponse {

    private long totalActiveProbations;
    private long overdueCount;
    private long endingThisWeek;
    private long endingThisMonth;
    private long evaluationsDue;

    private long confirmationsThisMonth;
    private long terminationsThisMonth;

    private Double averageConfirmationRate;
    private Double averageProbationDuration;

    private Map<String, Long> byStatus;
    private Map<String, Long> byDepartment;
}
