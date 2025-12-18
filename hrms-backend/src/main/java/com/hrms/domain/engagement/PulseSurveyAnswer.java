package com.hrms.domain.engagement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "pulse_survey_answers", indexes = {
        @Index(name = "idx_psa_response", columnList = "response_id"),
        @Index(name = "idx_psa_question", columnList = "question_id"),
        @Index(name = "idx_psa_survey_question", columnList = "survey_id, question_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PulseSurveyAnswer extends TenantAware {

    @Column(name = "survey_id", nullable = false)
    private UUID surveyId;

    @Column(name = "response_id", nullable = false)
    private UUID responseId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "numeric_value")
    private Integer numericValue; // For RATING, NPS, LIKERT types

    @Column(name = "text_value", columnDefinition = "TEXT")
    private String textValue; // For TEXT type or selected option(s)

    @Column(name = "selected_options", columnDefinition = "TEXT")
    private String selectedOptions; // JSON array for MULTIPLE_CHOICE

    @Column(name = "boolean_value")
    private Boolean booleanValue; // For YES_NO type

    @Column(name = "is_skipped")
    @Builder.Default
    private Boolean isSkipped = false;
}
