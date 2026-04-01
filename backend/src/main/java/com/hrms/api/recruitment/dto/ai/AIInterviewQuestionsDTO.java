package com.hrms.api.recruitment.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO mapping AI interview questions JSON output.
 * Ignores unknown properties to handle extra fields from AI responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AIInterviewQuestionsDTO {
    private List<TechnicalQuestion> technicalQuestions;
    private List<BehavioralQuestion> behavioralQuestions;
    private List<SituationalQuestion> situationalQuestions;
    private List<CulturalFitQuestion> culturalFitQuestions;
    private List<RoleSpecificQuestion> roleSpecificQuestions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TechnicalQuestion {
        private String question;
        private String purpose;
        private String difficulty;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BehavioralQuestion {
        private String question;
        private String competency;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SituationalQuestion {
        private String question;
        private String scenario;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CulturalFitQuestion {
        private String question;
        private String value;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RoleSpecificQuestion {
        private String question;
        private String focus;
    }
}
