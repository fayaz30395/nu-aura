package com.hrms.api.compensation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompensationStatisticsResponse {

    private long totalRevisions;
    private long pendingApprovals;
    private long approvedRevisions;
    private long appliedRevisions;

    private BigDecimal totalIncrementAmount;
    private Double averageIncrementPercentage;

    private long promotionsCount;

    private BigDecimal budgetAllocated;
    private BigDecimal budgetUtilized;
    private Double budgetUtilizationPercentage;

    private Map<String, Long> revisionsByStatus;
    private Map<String, Long> revisionsByType;
    private Map<String, Double> avgIncrementByDepartment;
}
