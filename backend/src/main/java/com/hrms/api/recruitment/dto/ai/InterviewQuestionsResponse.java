package com.hrms.api.recruitment.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestionsResponse {
    private boolean success;
    private String message;

    private List<TechnicalQuestion> technicalQuestions;
    private List<BehavioralQuestion> behavioralQuestions;
    private List<SituationalQuestion> situationalQuestions;
    private List<CulturalFitQuestion> culturalFitQuestions;
    private List<RoleSpecificQuestion> roleSpecificQuestions;

    // Raw JSON for full response
    private String rawJson;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TechnicalQuestion {
        private String question;
        private String purpose;
        private String difficulty; // easy, medium, hard
        private String expectedAnswer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BehavioralQuestion {
        private String question;
        private String competency;
        private List<String> followUpQuestions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SituationalQuestion {
        private String question;
        private String scenario;
        private String whatToLookFor;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CulturalFitQuestion {
        private String question;
        private String value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleSpecificQuestion {
        private String question;
        private String focus;
    }
}
