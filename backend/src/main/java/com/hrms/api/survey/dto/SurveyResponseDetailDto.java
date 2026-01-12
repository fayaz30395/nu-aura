package com.hrms.api.survey.dto;

import com.hrms.domain.survey.SurveyResponse.ResponseStatus;
import com.hrms.domain.survey.SurveyResponse.SentimentLevel;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyResponseDetailDto {

    private UUID id;
    private UUID surveyId;
    private String surveyTitle;
    private UUID employeeId;
    private String employeeName;
    private String anonymousId;
    private ResponseStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private int completionTimeMinutes;
    private Double engagementScore;
    private Double sentimentScore;
    private Double npsScore;
    private SentimentLevel overallSentiment;
    private String department;
    private String location;
    private String grade;
    private Integer tenureMonths;
    private List<AnswerDto> answers;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerDto {
        private UUID id;
        private UUID questionId;
        private String questionText;
        private String textAnswer;
        private Integer selectedOption;
        private List<Integer> selectedOptions;
        private Integer ratingAnswer;
        private Integer npsScore;
        private Double numericAnswer;
        private Double sentimentScore;
        private String sentimentLevel;
        private LocalDateTime answeredAt;
    }
}
