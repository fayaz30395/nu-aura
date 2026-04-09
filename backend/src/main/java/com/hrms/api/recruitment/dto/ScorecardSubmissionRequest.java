package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.InterviewScorecard;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ScorecardSubmissionRequest {

    @NotNull(message = "Interview ID is required")
    private UUID interviewId;

    @NotNull(message = "Applicant ID is required")
    private UUID applicantId;

    @NotNull(message = "Job opening ID is required")
    private UUID jobOpeningId;

    @Min(value = 1, message = "Overall rating must be between 1 and 5")
    @Max(value = 5, message = "Overall rating must be between 1 and 5")
    private Integer overallRating;

    private InterviewScorecard.Recommendation recommendation;

    private String overallNotes;

    @Valid
    private List<CriterionScore> criteriaScores;

    @Data
    public static class CriterionScore {
        @NotNull(message = "Criterion name is required")
        private String name;

        private String category;

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be between 1 and 5")
        @Max(value = 5, message = "Rating must be between 1 and 5")
        private Integer rating;

        private Double weight;

        private String notes;

        private Integer orderIndex;
    }
}
