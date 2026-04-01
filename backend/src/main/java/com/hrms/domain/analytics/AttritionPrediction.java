package com.hrms.domain.analytics;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "attrition_predictions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AttritionPrediction extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "prediction_date", nullable = false)
    private LocalDate predictionDate;

    @Column(name = "risk_score", precision = 5, scale = 2, nullable = false)
    private BigDecimal riskScore; // 0-100 scale

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    private RiskLevel riskLevel;

    @Column(name = "predicted_leave_date")
    private LocalDate predictedLeaveDate;

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    // Risk factors
    @Column(name = "tenure_risk", precision = 5, scale = 2)
    private BigDecimal tenureRisk;

    @Column(name = "compensation_risk", precision = 5, scale = 2)
    private BigDecimal compensationRisk;

    @Column(name = "engagement_risk", precision = 5, scale = 2)
    private BigDecimal engagementRisk;

    @Column(name = "performance_risk", precision = 5, scale = 2)
    private BigDecimal performanceRisk;

    @Column(name = "manager_change_risk", precision = 5, scale = 2)
    private BigDecimal managerChangeRisk;

    @Column(name = "promotion_gap_risk", precision = 5, scale = 2)
    private BigDecimal promotionGapRisk;

    @Column(name = "workload_risk", precision = 5, scale = 2)
    private BigDecimal workloadRisk;

    @Column(name = "commute_risk", precision = 5, scale = 2)
    private BigDecimal commuteRisk;

    // Features used for prediction
    @Column(name = "tenure_months")
    private Integer tenureMonths;

    @Column(name = "salary_percentile", precision = 5, scale = 2)
    private BigDecimal salaryPercentile;

    @Column(name = "last_promotion_months")
    private Integer lastPromotionMonths;

    @Column(name = "manager_tenure_months")
    private Integer managerTenureMonths;

    @Column(name = "overtime_hours_avg", precision = 5, scale = 2)
    private BigDecimal overtimeHoursAvg;

    @Column(name = "engagement_score", precision = 5, scale = 2)
    private BigDecimal engagementScore;

    @Column(name = "performance_rating", precision = 3, scale = 1)
    private BigDecimal performanceRating;

    // Recommendations
    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations; // JSON array of recommendations

    @Column(name = "action_taken")
    @Builder.Default
    private Boolean actionTaken = false;

    @Column(name = "actual_outcome")
    @Enumerated(EnumType.STRING)
    private ActualOutcome actualOutcome;

    @Column(name = "actual_leave_date")
    private LocalDate actualLeaveDate;

    public enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum ActualOutcome {
        STAYED,
        LEFT_VOLUNTARY,
        LEFT_INVOLUNTARY,
        UNKNOWN
    }
}
