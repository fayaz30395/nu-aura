package com.hrms.api.engagement.dto;

import com.hrms.domain.engagement.PulseSurvey.SurveyFrequency;
import com.hrms.domain.engagement.PulseSurvey.SurveyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PulseSurveyRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    private String description;

    @NotNull(message = "Survey type is required")
    private SurveyType surveyType;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private Boolean isAnonymous;
    private Boolean isMandatory;
    private SurveyFrequency frequency;
    private List<UUID> targetDepartmentIds;
    private List<String> targetLocations;
    private Boolean reminderEnabled;
    private Integer reminderDaysBefore;
    private List<QuestionRequest> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionRequest {
        @NotBlank(message = "Question text is required")
        private String questionText;

        @NotNull(message = "Question type is required")
        private String questionType;

        private Integer questionOrder;
        private Boolean isRequired;
        private List<String> options;
        private Integer minValue;
        private Integer maxValue;
        private String minLabel;
        private String maxLabel;
        private String category;
        private String helpText;
    }
}
