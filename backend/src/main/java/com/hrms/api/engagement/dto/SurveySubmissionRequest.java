package com.hrms.api.engagement.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveySubmissionRequest {

    @NotNull(message = "Survey ID is required")
    private UUID surveyId;

    private List<AnswerRequest> answers;
    private Integer timeSpentSeconds;
    private String deviceType;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerRequest {
        @NotNull(message = "Question ID is required")
        private UUID questionId;

        private Integer numericValue;
        private String textValue;
        private List<String> selectedOptions;
        private Boolean booleanValue;
        private Boolean isSkipped;
    }
}
