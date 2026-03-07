package com.hrms.api.lms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptRequest {

    @NotNull(message = "Quiz ID is required")
    private UUID quizId;

    // Map of question ID to answer value
    // For SINGLE_CHOICE/TRUE_FALSE: String value
    // For MULTIPLE_CHOICE: List of String values
    // For ESSAY: Text answer
    // For FILL_BLANK: String answer
    private Map<String, Object> answers;
}
