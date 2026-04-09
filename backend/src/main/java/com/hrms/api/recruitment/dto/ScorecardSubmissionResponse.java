package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.InterviewScorecard;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ScorecardSubmissionResponse {

    private UUID id;
    private UUID tenantId;
    private UUID interviewId;
    private UUID applicantId;
    private UUID jobOpeningId;
    private UUID interviewerId;
    private UUID templateId;
    private Integer overallRating;
    private InterviewScorecard.Recommendation recommendation;
    private String overallNotes;
    private InterviewScorecard.ScorecardStatus status;
    private LocalDateTime submittedAt;
    private List<CriterionScoreResponse> criteriaScores;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class CriterionScoreResponse {
        private UUID id;
        private String name;
        private String category;
        private Integer rating;
        private Double weight;
        private String notes;
        private Integer orderIndex;
    }
}
