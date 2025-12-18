package com.hrms.domain.analytics;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "analytics_insights")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsInsight extends TenantAware {


    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "insight_type", nullable = false)
    private InsightType insightType;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private InsightCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity")
    private InsightSeverity severity;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "department_name")
    private String departmentName;

    // Impact assessment
    @Column(name = "impact_score")
    private Integer impactScore; // 1-10

    @Column(name = "affected_employees")
    private Integer affectedEmployees;

    @Column(name = "potential_cost_impact", precision = 15, scale = 2)
    private java.math.BigDecimal potentialCostImpact;

    // Recommendation
    @Column(name = "recommendation", columnDefinition = "TEXT")
    private String recommendation;

    @Column(name = "action_items", columnDefinition = "TEXT")
    private String actionItems; // JSON array

    // Status tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private InsightStatus status = InsightStatus.NEW;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    // Data source
    @Column(name = "data_source")
    private String dataSource;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    public enum InsightType {
        TREND,
        ANOMALY,
        PREDICTION,
        BENCHMARK,
        RECOMMENDATION,
        ALERT
    }

    public enum InsightCategory {
        ATTRITION,
        HIRING,
        PERFORMANCE,
        COMPENSATION,
        ENGAGEMENT,
        DIVERSITY,
        COMPLIANCE,
        COST
    }

    public enum InsightSeverity {
        INFO,
        WARNING,
        CRITICAL
    }

    public enum InsightStatus {
        NEW,
        ACKNOWLEDGED,
        IN_PROGRESS,
        RESOLVED,
        DISMISSED
    }
}
