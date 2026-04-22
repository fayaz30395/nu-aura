package com.hrms.domain.organization;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "succession_candidates",
        uniqueConstraints = @UniqueConstraint(columnNames = {"succession_plan_id", "candidate_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SuccessionCandidate extends TenantAware {


    @Column(name = "succession_plan_id", nullable = false)
    private UUID successionPlanId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReadinessLevel readiness;

    @Builder.Default
    private Integer priority = 1; // 1 = first choice, 2 = second choice, etc.

    @Enumerated(EnumType.STRING)
    private PerformanceRating performanceRating;

    @Enumerated(EnumType.STRING)
    private PotentialRating potentialRating;

    private LocalDate estimatedReadyDate;

    @Column(columnDefinition = "TEXT")
    private String developmentNeeds;

    @Column(columnDefinition = "TEXT")
    private String developmentPlan;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(columnDefinition = "TEXT")
    private String gaps;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    private Boolean isConfidential = false;

    // 9-Box Grid position calculation
    public String getNineBoxPosition() {
        if (performanceRating == null || potentialRating == null) return "UNKNOWN";

        boolean highPerformance = performanceRating == PerformanceRating.EXCEPTIONAL ||
                performanceRating == PerformanceRating.EXCEEDS_EXPECTATIONS;
        boolean medPerformance = performanceRating == PerformanceRating.MEETS_EXPECTATIONS;
        boolean highPotential = potentialRating == PotentialRating.HIGH;
        boolean medPotential = potentialRating == PotentialRating.MEDIUM;

        if (highPerformance && highPotential) return "STAR";
        if (highPerformance && medPotential) return "HIGH_PERFORMER";
        if (highPerformance) return "SOLID_PERFORMER";
        if (medPerformance && highPotential) return "HIGH_POTENTIAL";
        if (medPerformance && medPotential) return "CORE_PLAYER";
        if (medPerformance) return "EFFECTIVE";
        if (highPotential) return "INCONSISTENT";
        if (medPotential) return "UNDERPERFORMER";
        return "RISK";
    }

    public enum ReadinessLevel {
        READY_NOW,
        READY_1_YEAR,
        READY_2_YEARS,
        READY_3_PLUS_YEARS,
        DEVELOPMENTAL
    }

    public enum PerformanceRating {
        EXCEPTIONAL,
        EXCEEDS_EXPECTATIONS,
        MEETS_EXPECTATIONS,
        NEEDS_IMPROVEMENT,
        UNSATISFACTORY
    }

    public enum PotentialRating {
        HIGH,
        MEDIUM,
        LOW,
        UNCLEAR
    }
}
