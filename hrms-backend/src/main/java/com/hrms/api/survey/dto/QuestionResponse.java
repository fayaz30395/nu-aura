package com.hrms.api.survey.dto;

import com.hrms.domain.survey.SurveyQuestion;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionResponse {

    private UUID id;
    private UUID surveyId;
    private String questionText;
    private SurveyQuestion.QuestionType questionType;
    private int questionOrder;
    private boolean isRequired;
    private List<String> options;
    private SurveyQuestion.EngagementCategory engagementCategory;
    private Integer minScale;
    private Integer maxScale;
    private String minLabel;
    private String maxLabel;
    private Double weight;
    private UUID dependsOnQuestionId;
    private String dependsOnAnswer;
    private LocalDateTime createdAt;
}
