package com.hrms.api.survey.dto;

import com.hrms.domain.survey.Survey;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SurveyRequest {

    @NotBlank(message = "Survey code is required")
    @Size(max = 50, message = "Survey code cannot exceed 50 characters")
    private String surveyCode;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title cannot exceed 200 characters")
    private String title;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @NotNull(message = "Survey type is required")
    private Survey.SurveyType surveyType;

    private Boolean isAnonymous;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Survey.SurveyStatus status;

    @Size(max = 500, message = "Target audience cannot exceed 500 characters")
    private String targetAudience;
}
