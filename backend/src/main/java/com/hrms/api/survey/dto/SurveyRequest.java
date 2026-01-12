package com.hrms.api.survey.dto;

import com.hrms.domain.survey.Survey;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SurveyRequest {

    @NotBlank(message = "Survey code is required")
    private String surveyCode;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Survey type is required")
    private Survey.SurveyType surveyType;

    private Boolean isAnonymous;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Survey.SurveyStatus status;

    private String targetAudience;
}
