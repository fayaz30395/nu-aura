package com.hrms.domain.survey;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Aggregated engagement scores for analytics and trending.
 */
@Entity
@Table(name = "engagement_scores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EngagementScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_id")
    private Survey survey;

    @Column(nullable = false)
    private LocalDate scoreDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScoreLevel scoreLevel;

    @Enumerated(EnumType.STRING)
    private ScoreType scoreType;

    // Dimensions (for drill-down)
    private UUID departmentId;
    private UUID locationId;
    private String grade;
    private String employmentType;

    // Overall scores
    @Column(nullable = false)
    private Double overallScore;
    private Double previousScore;
    private Double scoreDelta;

    // Category scores
    private Double jobSatisfactionScore;
    private Double workEnvironmentScore;
    private Double leadershipScore;
    private Double communicationScore;
    private Double growthOpportunitiesScore;
    private Double compensationScore;
    private Double workLifeBalanceScore;
    private Double teamCollaborationScore;
    private Double recognitionScore;
    private Double companyCultureScore;
    private Double managerRelationshipScore;

    // NPS metrics
    private Double npsScore;
    private Integer promoters;
    private Integer passives;
    private Integer detractors;

    // Sentiment metrics
    private Double averageSentiment;
    private Integer positiveResponses;
    private Integer neutralResponses;
    private Integer negativeResponses;

    // Response metrics
    private Integer totalResponses;
    private Integer totalEligible;
    private Double responseRate;

    // Benchmark comparison
    private Double industryBenchmark;
    private Double companyBenchmark;

    private LocalDateTime calculatedAt;

    public enum ScoreLevel {
        ORGANIZATION,
        DEPARTMENT,
        LOCATION,
        TEAM,
        MANAGER,
        GRADE
    }

    public enum ScoreType {
        ENGAGEMENT,
        PULSE,
        EXIT,
        SATISFACTION,
        CUSTOM
    }

    @PrePersist
    protected void onCreate() {
        calculatedAt = LocalDateTime.now();
    }

    public String getEngagementLevel() {
        if (overallScore >= 80) return "Highly Engaged";
        if (overallScore >= 60) return "Engaged";
        if (overallScore >= 40) return "Partially Engaged";
        if (overallScore >= 20) return "Disengaged";
        return "Highly Disengaged";
    }
}
