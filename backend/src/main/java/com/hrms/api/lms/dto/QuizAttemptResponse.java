package com.hrms.api.lms.dto;

import com.hrms.domain.lms.QuizAttempt;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptResponse {

    private UUID id;
    private UUID quizId;
    private UUID enrollmentId;
    private QuizAttempt.AttemptStatus status;
    private Integer score;
    private Integer maxScore;
    private Integer passingScore;
    private Boolean passed;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer timeTakenSeconds;
    private Integer attemptNumber;
    private String feedback;
    private Map<String, Object> answers;
}
