package com.nulogic.domain.survey;

import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * AI-generated insights from survey analysis.
 *
 * <p>{@code generatedAt} is stamped by {@link TimeAuditingEntityListener} via
 * {@link TenantTimestamp}, resolving the tenant's IANA zone through
 * {@code TenantTimeService}. Closes audit row 6 in
 * {@code backend/docs/audit/prepersist-now-audit.md}.</p>
 */
@Entity
@Table(name = "survey_insights")
@EntityListeners(TimeAuditingEntityListener.class)
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

    @TenantTimestamp
    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
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
