package com.hrms.api.recruitment.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO mapping AI feedback synthesis JSON output.
 * Ignores unknown properties to handle extra fields from AI responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AIFeedbackSynthesisDTO {
    private String candidateNarrative;
    private List<String> themes;
    private List<String> agreements;
    private List<String> disagreements;
    private List<String> missingData;
    private List<String> openQuestions;
    private String recommendedNextStep;
}
