package com.hrms.domain.survey;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * AI-generated insights from survey analysis.
 */
@Entity
@Table(name = "survey_insights")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_id")
    private Survey survey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InsightType insightType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InsightPriority priority;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    // Related dimension
    @Enumerated(EnumType.STRING)
    private SurveyQuestion.EngagementCategory category;
    private UUID departmentId;
    private UUID locationId;

    // Metrics
    private Double impactScore;
    private Double confidenceScore;
    private Integer affectedEmployees;
    private Double percentageChange;

    // Keywords and themes
    private String keyThemes; // JSON array
    private String relatedQuestions; // JSON array of question IDs

    // Trends
    @Enumerated(EnumType.STRING)
    private TrendDirection trend;
    private Integer trendPeriodWeeks;

    // Action tracking
    @Enumerated(EnumType.STRING)
    private ActionStatus actionStatus;
    private UUID assignedTo;
    private LocalDateTime actionDueDate;
    private String actionNotes;

    private boolean isAcknowledged;
    private UUID acknowledgedBy;
    private LocalDateTime acknowledgedAt;

    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        generatedAt = LocalDateTime.now();
        if (actionStatus == null) actionStatus = ActionStatus.NEW;
    }

    public enum InsightType {
        STRENGTH,
        WEAKNESS,
        TREND_UP,
        TREND_DOWN,
        ANOMALY,
        BENCHMARK_GAP,
        SENTIMENT_ALERT,
        ENGAGEMENT_RISK,
        RETENTION_RISK,
        MANAGER_FEEDBACK,
        DEPARTMENT_COMPARISON,
        RECOMMENDATION
    }

    public enum InsightPriority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW,
        INFORMATIONAL
    }

    public enum TrendDirection {
        IMPROVING,
        STABLE,
        DECLINING,
        VOLATILE
    }

    public enum ActionStatus {
        NEW,
        ACKNOWLEDGED,
        IN_PROGRESS,
        COMPLETED,
        DISMISSED
    }
}
