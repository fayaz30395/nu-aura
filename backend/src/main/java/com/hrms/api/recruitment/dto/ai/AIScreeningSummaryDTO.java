package com.hrms.api.recruitment.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO mapping AI screening summary JSON output.
 * Ignores unknown properties to handle extra fields from AI responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AIScreeningSummaryDTO {
    private String fitLevel;
    private List<String> strengths;
    private List<String> gaps;
    private List<String> followUpQuestions;
    private List<String> riskFlags;
    private String recommendation;
    private String summary;
}
