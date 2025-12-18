package com.hrms.api.survey.dto;

import lombok.*;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitResponseRequest {

    @NotNull(message = "Survey ID is required")
    private UUID surveyId;

    private UUID employeeId; // Optional for anonymous surveys

    private List<AnswerRequest> answers;

    // Optional demographic data
    private String department;
    private String location;
    private String grade;
    private Integer tenureMonths;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerRequest {
        @NotNull(message = "Question ID is required")
        private UUID questionId;

        private String textAnswer;
        private Integer selectedOption; // Index for single choice
        private List<Integer> selectedOptions; // Indices for multiple choice
        private Integer ratingAnswer;
        private Integer npsScore;
        private Double numericAnswer;
        private List<Integer> ranking; // For ranking questions
    }
}
