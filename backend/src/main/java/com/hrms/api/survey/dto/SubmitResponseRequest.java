package com.hrms.api.survey.dto;

import lombok.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
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

    @Valid
    @Size(max = 200, message = "Cannot have more than 200 answers")
    private List<AnswerRequest> answers;

    // Optional demographic data
    @Size(max = 100, message = "Department cannot exceed 100 characters")
    private String department;

    @Size(max = 100, message = "Location cannot exceed 100 characters")
    private String location;

    @Size(max = 50, message = "Grade cannot exceed 50 characters")
    private String grade;

    @PositiveOrZero(message = "Tenure months cannot be negative")
    private Integer tenureMonths;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerRequest {
        @NotNull(message = "Question ID is required")
        private UUID questionId;

        @Size(max = 5000, message = "Text answer cannot exceed 5000 characters")
        private String textAnswer;

        private Integer selectedOption; // Index for single choice

        @Size(max = 50, message = "Cannot select more than 50 options")
        private List<Integer> selectedOptions; // Indices for multiple choice

        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 10, message = "Rating cannot exceed 10")
        private Integer ratingAnswer;

        @Min(value = 0, message = "NPS score must be at least 0")
        @Max(value = 10, message = "NPS score cannot exceed 10")
        private Integer npsScore;

        private Double numericAnswer;

        @Size(max = 20, message = "Cannot rank more than 20 items")
        private List<Integer> ranking; // For ranking questions
    }
}
