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
public class CandidateScreeningSummaryResponse {

    private UUID candidateId;
    private String candidateName;
    private UUID jobOpeningId;
    private String jobTitle;

    /**
     * High-level fit signal for humans only.
     * Example values: HIGH, MEDIUM, LOW.
     */
    private String fitLevel;

    private List<String> strengths;
    private List<String> gaps;
    private List<String> followUpQuestions;
    private List<String> riskFlags;

    /**
     * Optional recommendation hint that should be treated as guidance only,
     * not an automated decision. Example values:
     * ADVANCE, HOLD, REJECT.
     */
    private String recommendation;

    /**
     * Short narrative summary of the candidate for this role.
     */
    private String summary;

    private String aiModelVersion;
}

