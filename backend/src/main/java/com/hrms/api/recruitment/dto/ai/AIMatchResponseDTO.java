package com.hrms.api.recruitment.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO mapping AI candidate match/scoring JSON output.
 * Ignores unknown properties to handle extra fields from AI responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AIMatchResponseDTO {
    private Number overallScore;
    private Number skillsScore;
    private Number experienceScore;
    private Number educationScore;
    private Number culturalFitScore;

    private List<String> strengths;
    private List<String> gaps;
    private String recommendation;
    private String summary;
    private List<String> interviewFocus;
}
