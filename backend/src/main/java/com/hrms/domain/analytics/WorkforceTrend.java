package com.hrms.domain.analytics;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

@Entity
@Table(name = "workforce_trends")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WorkforceTrend extends TenantAware {


    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Enumerated(EnumType.STRING)
    @Column(name = "trend_type", nullable = false)
    private TrendType trendType;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "department_name")
    private String departmentName;

    // Headcount metrics
    @Column(name = "total_headcount")
    private Integer totalHeadcount;

    @Column(name = "new_hires")
    private Integer newHires;

    @Column(name = "terminations")
    private Integer terminations;

    @Column(name = "voluntary_attrition")
    private Integer voluntaryAttrition;

    @Column(name = "involuntary_attrition")
    private Integer involuntaryAttrition;

    @Column(name = "internal_transfers_in")
    private Integer internalTransfersIn;

    @Column(name = "internal_transfers_out")
    private Integer internalTransfersOut;

    // Rates
    @Column(name = "attrition_rate", precision = 5, scale = 2)
    private BigDecimal attritionRate;

    @Column(name = "voluntary_attrition_rate", precision = 5, scale = 2)
    private BigDecimal voluntaryAttritionRate;

    @Column(name = "hiring_rate", precision = 5, scale = 2)
    private BigDecimal hiringRate;

    @Column(name = "growth_rate", precision = 5, scale = 2)
    private BigDecimal growthRate;

    // Cost metrics
    @Column(name = "total_compensation", precision = 15, scale = 2)
    private BigDecimal totalCompensation;

    @Column(name = "avg_salary", precision = 12, scale = 2)
    private BigDecimal avgSalary;

    @Column(name = "avg_salary_increase", precision = 5, scale = 2)
    private BigDecimal avgSalaryIncrease;

    @Column(name = "cost_per_hire", precision = 12, scale = 2)
    private BigDecimal costPerHire;

    @Column(name = "training_cost", precision = 12, scale = 2)
    private BigDecimal trainingCost;

    // Engagement & Performance
    @Column(name = "avg_engagement_score", precision = 5, scale = 2)
    private BigDecimal avgEngagementScore;

    @Column(name = "avg_performance_rating", precision = 3, scale = 1)
    private BigDecimal avgPerformanceRating;

    @Column(name = "high_performers_count")
    private Integer highPerformersCount;

    @Column(name = "low_performers_count")
    private Integer lowPerformersCount;

    // Diversity metrics
    @Column(name = "gender_diversity_ratio", precision = 5, scale = 2)
    private BigDecimal genderDiversityRatio;

    @Column(name = "avg_tenure_months", precision = 6, scale = 1)
    private BigDecimal avgTenureMonths;

    @Column(name = "avg_age", precision = 4, scale = 1)
    private BigDecimal avgAge;

    // Time to fill
    @Column(name = "avg_time_to_fill_days", precision = 6, scale = 1)
    private BigDecimal avgTimeToFillDays;

    @Column(name = "open_positions")
    private Integer openPositions;

    public enum TrendType {
        ORGANIZATION,
        DEPARTMENT,
        LOCATION,
        JOB_FAMILY
    }
}
