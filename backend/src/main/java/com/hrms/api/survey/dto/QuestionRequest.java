package com.hrms.api.survey.dto;

import com.hrms.domain.survey.SurveyQuestion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionRequest {

    @NotBlank(message = "Question text is required")
    private String questionText;

    @NotNull(message = "Question type is required")
    private SurveyQuestion.QuestionType questionType;

    private int questionOrder;

    private boolean isRequired;

    private List<String> options;

    private SurveyQuestion.EngagementCategory engagementCategory;

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
}
