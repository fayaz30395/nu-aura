package com.hrms.api.recruitment.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateMatchResponse {
    private UUID candidateId;
    private String candidateName;
    private UUID jobOpeningId;
    private String jobTitle;

    // Scores (0-100)
    private double overallScore;
    private double skillsScore;
    private double experienceScore;
    private double educationScore;
    private double culturalFitScore;

    // Analysis
    private List<String> strengths;
    private List<String> gaps;
    private String recommendation; // HIGHLY_RECOMMENDED, RECOMMENDED, CONSIDER, NOT_RECOMMENDED
    private String summary;
    private List<String> interviewFocus;

    private String aiModelVersion;
}
