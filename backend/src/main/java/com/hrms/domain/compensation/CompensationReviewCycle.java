package com.hrms.domain.compensation;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "compensation_review_cycles", indexes = {
        @Index(name = "idx_comp_cycle_tenant", columnList = "tenant_id"),
        @Index(name = "idx_comp_cycle_status", columnList = "status"),
        @Index(name = "idx_comp_cycle_year", columnList = "fiscal_year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CompensationReviewCycle extends TenantAware {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "cycle_type", nullable = false)
    private CycleType cycleType;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private CycleStatus status = CycleStatus.DRAFT;

    @Column(name = "budget_amount", precision = 15, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "utilized_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal utilizedAmount = BigDecimal.ZERO;

    @Column(name = "min_increment_percentage", precision = 5, scale = 2)
    private BigDecimal minIncrementPercentage;

    @Column(name = "max_increment_percentage", precision = 5, scale = 2)
    private BigDecimal maxIncrementPercentage;

    @Column(name = "average_increment_target", precision = 5, scale = 2)
    private BigDecimal averageIncrementTarget;

    @Column(name = "include_all_employees")
    @Builder.Default
    private Boolean includeAllEmployees = true;

    @Column(name = "min_tenure_months")
    private Integer minTenureMonths;

    @Column(name = "exclude_probationers")
    @Builder.Default
    private Boolean excludeProbationers = true;

    @Column(name = "exclude_notice_period")
    @Builder.Default
    private Boolean excludeNoticePeriod = true;

    @Column(name = "allow_promotions")
    @Builder.Default
    private Boolean allowPromotions = true;

    @Column(name = "require_performance_rating")
    @Builder.Default
    private Boolean requirePerformanceRating = true;

    @Column(name = "min_performance_rating")
    private Double minPerformanceRating;

    // NOTE: createdBy is inherited from BaseEntity — do NOT redeclare here.
    // The inherited @CreatedBy field is auto-populated by JPA auditing.

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    @Column(name = "total_employees")
    @Builder.Default
    private Integer totalEmployees = 0;

    @Column(name = "revisions_drafted")
    @Builder.Default
    private Integer revisionsDrafted = 0;

    @Column(name = "revisions_approved")
    @Builder.Default
    private Integer revisionsApproved = 0;

    @Column(name = "revisions_applied")
    @Builder.Default
    private Integer revisionsApplied = 0;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "USD";

    public void activate() {
        this.status = CycleStatus.IN_PROGRESS;
    }

    public void moveToReview() {
        this.status = CycleStatus.REVIEW;
    }

    public void moveToApproval() {
        this.status = CycleStatus.APPROVAL;
    }

    public void approve(UUID approverId) {
        this.status = CycleStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvalDate = LocalDate.now();
    }

    public void complete() {
        this.status = CycleStatus.COMPLETED;
    }

    public void cancel() {
        this.status = CycleStatus.CANCELLED;
    }

    public BigDecimal getRemainingBudget() {
        if (budgetAmount == null) return null;
        return budgetAmount.subtract(utilizedAmount != null ? utilizedAmount : BigDecimal.ZERO);
    }

    public Double getBudgetUtilizationPercentage() {
        if (budgetAmount == null || budgetAmount.compareTo(BigDecimal.ZERO) == 0) return null;
        return utilizedAmount.multiply(new BigDecimal("100"))
                .divide(budgetAmount, 2, java.math.RoundingMode.HALF_UP)
                .doubleValue();
    }

    public boolean isActive() {
        return status == CycleStatus.IN_PROGRESS || status == CycleStatus.REVIEW;
    }

    public enum CycleType {
        ANNUAL,
        MID_YEAR,
        QUARTERLY,
        SPECIAL,
        AD_HOC
    }

    public enum CycleStatus {
        DRAFT,
        PLANNING,
        IN_PROGRESS,
        REVIEW,
        APPROVAL,
        APPROVED,
        COMPLETED,
        CANCELLED
    }
}
