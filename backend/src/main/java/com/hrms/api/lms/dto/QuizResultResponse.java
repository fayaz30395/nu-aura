package com.hrms.api.lms.dto;

import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizResultResponse {

    private Boolean passed;
    private Integer score;
    private Integer maxScore;
    private Integer passingScore;
    private Double percentage;
    private String feedback;
    private Map<String, Object> correctAnswers;
    private Integer timeTaken; // in seconds
}
