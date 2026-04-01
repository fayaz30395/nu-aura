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
public class FeedbackSynthesisResponse {

    private UUID candidateId;
    private String candidateName;
    private UUID jobOpeningId;
    private String jobTitle;

    /**
     * A cohesive narrative summarizing what has been learned
     * about the candidate across all interview rounds.
     */
    private String candidateNarrative;

    /**
     * Key themes that emerged across interview feedback.
     */
    private List<String> themes;

    /**
     * Points where multiple interviewers agreed.
     */
    private List<String> agreements;

    /**
     * Points where interviewers disagreed or had conflicting signals.
     */
    private List<String> disagreements;

    /**
     * Data or competencies that were not covered in any interview round.
     */
    private List<String> missingData;

    /**
     * Remaining questions that should be addressed in subsequent rounds.
     */
    private List<String> openQuestions;

    /**
     * Suggested next action (e.g., "Proceed to final round", "Schedule technical deep-dive").
     */
    private String recommendedNextStep;

    private String aiModelVersion;
}
