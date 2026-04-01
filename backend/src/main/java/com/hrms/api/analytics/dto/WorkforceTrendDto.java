package com.hrms.api.analytics.dto;

import com.hrms.domain.analytics.WorkforceTrend;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkforceTrendDto {

    private UUID id;
    private Integer periodYear;
    private Integer periodMonth;
    private String periodLabel; // "Jan 2024", etc.
    private String trendType;
    private UUID departmentId;
    private String departmentName;

    // Headcount metrics
    private Integer totalHeadcount;
    private Integer newHires;
    private Integer terminations;
    private Integer voluntaryAttrition;
    private Integer involuntaryAttrition;
    private Integer internalTransfersIn;
    private Integer internalTransfersOut;
    private Integer netChange;

    // Rates
    private BigDecimal attritionRate;
    private BigDecimal voluntaryAttritionRate;
    private BigDecimal hiringRate;
    private BigDecimal growthRate;

    // Cost metrics
    private BigDecimal totalCompensation;
    private BigDecimal avgSalary;
    private BigDecimal avgSalaryIncrease;
    private BigDecimal costPerHire;
    private BigDecimal trainingCost;

    // Engagement & Performance
    private BigDecimal avgEngagementScore;
    private BigDecimal avgPerformanceRating;
    private Integer highPerformersCount;
    private Integer lowPerformersCount;

    // Diversity metrics
    private BigDecimal genderDiversityRatio;
    private BigDecimal avgTenureMonths;
    private BigDecimal avgAge;

    // Time to fill
    private BigDecimal avgTimeToFillDays;
    private Integer openPositions;

    public static WorkforceTrendDto fromEntity(WorkforceTrend trend) {
        String[] monthNames = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        String periodLabel = monthNames[trend.getPeriodMonth() - 1] + " " + trend.getPeriodYear();

        int netChange = 0;
        if (trend.getNewHires() != null) netChange += trend.getNewHires();
        if (trend.getTerminations() != null) netChange -= trend.getTerminations();
        if (trend.getInternalTransfersIn() != null) netChange += trend.getInternalTransfersIn();
        if (trend.getInternalTransfersOut() != null) netChange -= trend.getInternalTransfersOut();

        return WorkforceTrendDto.builder()
                .id(trend.getId())
                .periodYear(trend.getPeriodYear())
                .periodMonth(trend.getPeriodMonth())
                .periodLabel(periodLabel)
                .trendType(trend.getTrendType() != null ? trend.getTrendType().name() : null)
                .departmentId(trend.getDepartmentId())
                .departmentName(trend.getDepartmentName())
                .totalHeadcount(trend.getTotalHeadcount())
                .newHires(trend.getNewHires())
                .terminations(trend.getTerminations())
                .voluntaryAttrition(trend.getVoluntaryAttrition())
                .involuntaryAttrition(trend.getInvoluntaryAttrition())
                .internalTransfersIn(trend.getInternalTransfersIn())
                .internalTransfersOut(trend.getInternalTransfersOut())
                .netChange(netChange)
                .attritionRate(trend.getAttritionRate())
                .voluntaryAttritionRate(trend.getVoluntaryAttritionRate())
                .hiringRate(trend.getHiringRate())
                .growthRate(trend.getGrowthRate())
                .totalCompensation(trend.getTotalCompensation())
                .avgSalary(trend.getAvgSalary())
                .avgSalaryIncrease(trend.getAvgSalaryIncrease())
                .costPerHire(trend.getCostPerHire())
                .trainingCost(trend.getTrainingCost())
                .avgEngagementScore(trend.getAvgEngagementScore())
                .avgPerformanceRating(trend.getAvgPerformanceRating())
                .highPerformersCount(trend.getHighPerformersCount())
                .lowPerformersCount(trend.getLowPerformersCount())
                .genderDiversityRatio(trend.getGenderDiversityRatio())
                .avgTenureMonths(trend.getAvgTenureMonths())
                .avgAge(trend.getAvgAge())
                .avgTimeToFillDays(trend.getAvgTimeToFillDays())
                .openPositions(trend.getOpenPositions())
                .build();
    }
}
