package com.hrms.api.survey.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyAnalyticsSummary {

    private UUID surveyId;
    private String surveyTitle;

    // Response metrics
    private Integer totalResponses;
    private Integer completedResponses;
    private Integer partialResponses;
    private Double completionRate;
    private Double averageCompletionTimeMinutes;

    // Engagement metrics
    private Double overallEngagementScore;
    private String engagementLevel;
    private Double engagementTrend;

    // NPS metrics
    private Double npsScore;
    private String npsCategory;
    private Integer promoterCount;
    private Integer passiveCount;
    private Integer detractorCount;

    // Sentiment analysis
    private Double averageSentimentScore;
    private Map<String, Integer> sentimentDistribution;

    // Category breakdown
    private Map<String, Double> categoryScores;
    private List<CategoryInsight> categoryInsights;

    // Department comparison
    private List<DepartmentScore> departmentScores;

    // Top insights
    private List<SurveyInsightDto> topInsights;

    // Question analytics
    private List<QuestionAnalytics> questionAnalytics;

    // Trends
    private List<TrendPoint> engagementTrendData;
    private List<TrendPoint> npsTrendData;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryInsight {
        private String category;
        private Double score;
        private Double previousScore;
        private Double change;
        private String trend;
        private String insight;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DepartmentScore {
        private UUID departmentId;
        private String departmentName;
        private Double engagementScore;
        private Double npsScore;
        private Integer responseCount;
        private Double responseRate;
        private String comparisonToAverage;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionAnalytics {
        private UUID questionId;
        private String questionText;
        private String questionType;
        private String engagementCategory;
        private Double averageScore;
        private Double sentimentScore;
        private Map<String, Integer> answerDistribution;
        private Integer responseCount;
        private List<String> topKeywords;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendPoint {
        private LocalDate date;
        private Double value;
        private Integer responses;
    }
}
