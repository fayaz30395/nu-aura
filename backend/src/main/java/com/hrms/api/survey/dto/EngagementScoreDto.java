package com.hrms.api.survey.dto;

import com.hrms.domain.survey.EngagementScore.ScoreLevel;
import com.hrms.domain.survey.EngagementScore.ScoreType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EngagementScoreDto {

    private UUID id;
    private UUID surveyId;
    private String surveyTitle;
    private LocalDate scoreDate;
    private ScoreLevel scoreLevel;
    private ScoreType scoreType;
    private UUID departmentId;
    private String departmentName;
    private UUID locationId;
    private String locationName;
    private String grade;
    private String employmentType;

    // Overall scores
    private Double overallScore;
    private Double previousScore;
    private Double scoreDelta;
    private String engagementLevel;

    // Category breakdown
    private Map<String, Double> categoryScores;

    // NPS metrics
    private Double npsScore;
    private Integer promoters;
    private Integer passives;
    private Integer detractors;
    private String npsCategory; // Promoter, Passive, Detractor

    // Sentiment metrics
    private Double averageSentiment;
    private Integer positiveResponses;
    private Integer neutralResponses;
    private Integer negativeResponses;

    // Response metrics
    private Integer totalResponses;
    private Integer totalEligible;
    private Double responseRate;

    // Benchmark comparison
    private Double industryBenchmark;
    private Double companyBenchmark;
    private Double benchmarkDelta;

    private LocalDateTime calculatedAt;
}
