package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "performance_reviews", indexes = {
        @Index(name = "idx_perf_review_tenant", columnList = "tenantId"),
        @Index(name = "idx_perf_review_tenant_employee", columnList = "tenantId,employee_id"),
        @Index(name = "idx_perf_review_tenant_reviewer", columnList = "tenantId,reviewer_id"),
        @Index(name = "idx_perf_review_cycle", columnList = "review_cycle_id"),
        @Index(name = "idx_perf_review_status", columnList = "status"),
        @Index(name = "idx_perf_review_period", columnList = "review_period_start,review_period_end")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PerformanceReview extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Column(name = "review_cycle_id")
    private UUID reviewCycleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", length = 50)
    private ReviewType reviewType;

    @Column(name = "review_period_start")
    private LocalDate reviewPeriodStart;

    @Column(name = "review_period_end")
    private LocalDate reviewPeriodEnd;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    @Builder.Default
    private ReviewStatus status = ReviewStatus.DRAFT;

    @Column(name = "overall_rating", precision = 3, scale = 2)
    private BigDecimal overallRating;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(name = "areas_for_improvement", columnDefinition = "TEXT")
    private String areasForImprovement;

    @Column(columnDefinition = "TEXT")
    private String achievements;

    @Column(name = "goals_for_next_period", columnDefinition = "TEXT")
    private String goalsForNextPeriod;

    @Column(name = "manager_comments", columnDefinition = "TEXT")
    private String managerComments;

    @Column(name = "employee_comments", columnDefinition = "TEXT")
    private String employeeComments;

    @Column(name = "self_rating")
    private Integer selfRating;

    @Column(name = "manager_rating")
    private Integer managerRating;

    @Column(name = "final_rating")
    private Integer finalRating;

    @Column(name = "increment_recommendation", precision = 5, scale = 2)
    private BigDecimal incrementRecommendation;

    @Column(name = "promotion_recommended")
    private Boolean promotionRecommended;

    @Column(name = "overall_comments", columnDefinition = "TEXT")
    private String overallComments;

    @Column(name = "goal_achievement_percent")
    private Integer goalAchievementPercent;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public enum ReviewType {
        SELF,       // Employee self-assessment
        MANAGER,    // Manager review
        PEER,       // Peer review
        UPWARD,     // Review of manager by direct report
        THREE_SIXTY // 360-degree review (all of the above)
    }

    public enum ReviewStatus {
        DRAFT,
        SUBMITTED,
        IN_REVIEW,
        COMPLETED,
        ACKNOWLEDGED
    }
}
