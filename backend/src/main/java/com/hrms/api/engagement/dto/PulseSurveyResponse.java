package com.hrms.api.engagement.dto;

import com.hrms.domain.engagement.PulseSurvey;
import com.hrms.domain.engagement.PulseSurveyQuestion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PulseSurveyResponse {
    private UUID id;
    private String title;
    private String description;
    private PulseSurvey.SurveyStatus status;
    private PulseSurvey.SurveyType surveyType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isAnonymous;
    private Boolean isMandatory;
    private PulseSurvey.SurveyFrequency frequency;
    private List<String> targetDepartments;
    private List<String> targetLocations;
    private Boolean reminderEnabled;
    private Integer reminderDaysBefore;
    private Integer totalQuestions;
    private Integer totalResponses;
    private Integer totalInvited;
    private Double averageScore;
    private Double responseRate;
    private LocalDateTime publishedAt;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private Boolean isTemplate;
    private String templateName;
    private String templateCategory;
    private List<QuestionResponse> questions;

    public static PulseSurveyResponse fromEntity(PulseSurvey survey) {
        return PulseSurveyResponse.builder()
                .id(survey.getId())
                .title(survey.getTitle())
                .description(survey.getDescription())
                .status(survey.getStatus())
                .surveyType(survey.getSurveyType())
                .startDate(survey.getStartDate())
                .endDate(survey.getEndDate())
                .isAnonymous(survey.getIsAnonymous())
                .isMandatory(survey.getIsMandatory())
                .frequency(survey.getFrequency())
                .reminderEnabled(survey.getReminderEnabled())
                .reminderDaysBefore(survey.getReminderDaysBefore())
                .totalQuestions(survey.getTotalQuestions())
                .totalResponses(survey.getTotalResponses())
                .totalInvited(survey.getTotalInvited())
                .averageScore(survey.getAverageScore())
                .responseRate(survey.getResponseRate())
                .publishedAt(survey.getPublishedAt())
                .closedAt(survey.getClosedAt())
                .createdAt(survey.getCreatedAt())
                .isTemplate(survey.getIsTemplate())
                .templateName(survey.getTemplateName())
                .templateCategory(survey.getTemplateCategory())
                .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionResponse {
        private UUID id;
        private String questionText;
        private PulseSurveyQuestion.QuestionType questionType;
        private Integer questionOrder;
        private Boolean isRequired;
        private List<String> options;
        private Integer minValue;
        private Integer maxValue;
        private String minLabel;
        private String maxLabel;
        private PulseSurveyQuestion.QuestionCategory category;
        private String helpText;
    }
}
