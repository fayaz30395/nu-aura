package com.hrms.domain.survey;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Survey question with various types and engagement measurement support.
 */
@Entity
@Table(name = "survey_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_id", nullable = false)
    private Survey survey;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private int questionOrder;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType questionType;

    @Column(columnDefinition = "TEXT")
    private String options; // JSON array for choice questions

    @Column(nullable = false)
    private boolean isRequired;

    // Engagement/sentiment category
    @Enumerated(EnumType.STRING)
    private EngagementCategory engagementCategory;

    // For Likert scales
    private Integer minScale;
    private Integer maxScale;
    private String minLabel;
    private String maxLabel;

    // Weight for scoring
    private Double weight;

    // Conditional logic
    private UUID dependsOnQuestionId;
    private String dependsOnAnswer;

    private LocalDateTime createdAt;

    public enum QuestionType {
        SINGLE_CHOICE,
        MULTIPLE_CHOICE,
        LIKERT_SCALE,
        RATING,
        NET_PROMOTER_SCORE,
        TEXT_SHORT,
        TEXT_LONG,
        RANKING,
        MATRIX,
        DATE,
        NUMBER
    }

    public enum EngagementCategory {
        JOB_SATISFACTION,
        WORK_ENVIRONMENT,
        LEADERSHIP,
        COMMUNICATION,
        GROWTH_OPPORTUNITIES,
        COMPENSATION_BENEFITS,
        WORK_LIFE_BALANCE,
        TEAM_COLLABORATION,
        RECOGNITION,
        COMPANY_CULTURE,
        MANAGER_RELATIONSHIP,
        AUTONOMY,
        RESOURCES,
        OVERALL_ENGAGEMENT,
        OTHER
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (weight == null) weight = 1.0;
    }
}
