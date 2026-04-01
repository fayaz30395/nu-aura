package com.hrms.api.lms.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizDetailResponse {

    private UUID id;
    private String title;
    private String instructions;
    private Integer timeLimitMinutes;
    private Integer passingScore;
    private Integer maxAttempts;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showCorrectAnswers;
    private Boolean showScoreImmediately;
    private Integer questionsPerAttempt;
    private List<QuizQuestionDto> questions;
}
