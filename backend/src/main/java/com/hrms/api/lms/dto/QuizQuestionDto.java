package com.hrms.api.lms.dto;

import com.hrms.domain.lms.QuizQuestion;
import lombok.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizQuestionDto {

    private UUID id;
    private String questionText;
    private String questionImageUrl;
    private QuizQuestion.QuestionType questionType;
    private List<Map<String, Object>> options; // For SINGLE_CHOICE, MULTIPLE_CHOICE, MATCHING
    private Boolean correctAnswer; // For TRUE_FALSE
    private Integer points;
    private Integer orderIndex;
    private Boolean isMandatory;
    private String explanation;

    // NOTE: Do NOT include correct answers in this DTO for student view
    // Correct answers are only revealed after quiz completion if quiz settings allow
}
