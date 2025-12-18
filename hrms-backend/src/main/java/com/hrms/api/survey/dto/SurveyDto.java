package com.hrms.api.survey.dto;

import com.hrms.domain.survey.Survey;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SurveyDto {

    private UUID id;
    private UUID tenantId;
    private String surveyCode;
    private String title;
    private String description;
    private Survey.SurveyType surveyType;
    private Boolean isAnonymous;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Survey.SurveyStatus status;
    private String targetAudience;
    private Integer totalResponses;
    private UUID createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
