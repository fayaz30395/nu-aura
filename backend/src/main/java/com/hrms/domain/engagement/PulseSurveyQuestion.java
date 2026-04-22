package com.hrms.domain.engagement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "pulse_survey_questions", indexes = {
        @Index(name = "idx_psq_survey", columnList = "survey_id"),
        @Index(name = "idx_psq_order", columnList = "survey_id, question_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PulseSurveyQuestion extends TenantAware {

    @Column(name = "survey_id", nullable = false)
    private UUID surveyId;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType;

    @Column(name = "question_order", nullable = false)
    private Integer questionOrder;

    @Column(name = "is_required")
    @Builder.Default
    private Boolean isRequired = true;

    @Column(name = "options", columnDefinition = "TEXT")
    private String options; // JSON array of options for MULTIPLE_CHOICE, SINGLE_CHOICE

    @Column(name = "min_value")
    private Integer minValue; // For RATING/SCALE type

    @Column(name = "max_value")
    private Integer maxValue; // For RATING/SCALE type

    @Column(name = "min_label", length = 100)
    private String minLabel; // e.g., "Strongly Disagree"

    @Column(name = "max_label", length = 100)
    private String maxLabel; // e.g., "Strongly Agree"

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private QuestionCategory category;

    @Column(name = "help_text", length = 500)
    private String helpText;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    public enum QuestionType {
        RATING,          // 1-5 or 1-10 scale
        NPS,             // Net Promoter Score (0-10)
        LIKERT,          // Likert scale (Strongly Disagree to Strongly Agree)
        SINGLE_CHOICE,   // Single selection from options
        MULTIPLE_CHOICE, // Multiple selection from options
        TEXT,            // Free text response
        YES_NO,          // Boolean response
        EMOJI            // Emoji-based rating (😢😐😊)
    }

    public enum QuestionCategory {
        ENGAGEMENT,       // Overall engagement
        MANAGEMENT,       // Manager relationship
        WORK_ENVIRONMENT, // Workplace conditions
        GROWTH,           // Career development
        RECOGNITION,      // Appreciation & rewards
        COMMUNICATION,    // Team/org communication
        WORK_LIFE_BALANCE,// Balance & wellness
        COMPENSATION,     // Pay & benefits
        TEAM_DYNAMICS,    // Team collaboration
        COMPANY_CULTURE   // Values & culture
    }
}
