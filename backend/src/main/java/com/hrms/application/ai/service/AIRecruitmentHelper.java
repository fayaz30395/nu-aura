package com.hrms.application.ai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

/**
 * Shared infrastructure helper for AI recruitment services.
 * Encapsulates OpenAI API calls, JSON extraction, mock response generation,
 * and other utilities shared across ResumeParserService, CandidateMatchingService,
 * and InterviewGenerationService.
 */
@Component
@RequiredArgsConstructor
@Slf4j
class AIRecruitmentHelper {

    private final RestTemplate restTemplate;

    @Value("${ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${ai.openai.base-url:https://api.openai.com/v1}")
    private String openAiBaseUrl;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String openAiModel;

    // ==================== OPENAI ====================

    String callOpenAI(String prompt) {
        if (openAiApiKey == null || openAiApiKey.isEmpty()) {
            log.warn("OpenAI API key not configured, returning mock response");
            return getMockResponse(prompt);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openAiModel);
            requestBody.put("messages", List.of(
                    Map.of("role", "user", "content", prompt)));
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 2000);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    openAiBaseUrl + "/chat/completions",
                    HttpMethod.POST,
                    entity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getBody() != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }

            return "";
        } catch (RuntimeException e) {
            log.error("Error calling OpenAI API: {}", e.getMessage());
            return getMockResponse(prompt);
        }
    }

    // ==================== JSON EXTRACTION ====================

    String extractJson(String response) {
        // Handle markdown code blocks first (```json...``` or ```...```)
        String json = response;
        if (json.contains("```json")) {
            int start = json.indexOf("```json") + 7;
            int end = json.indexOf("```", start);
            if (end > start) {
                json = json.substring(start, end);
            }
        } else if (json.contains("```")) {
            int start = json.indexOf("```") + 3;
            int end = json.indexOf("```", start);
            if (end > start) {
                json = json.substring(start, end);
            }
        }

        // Try to find JSON block
        int start = json.indexOf("{");
        int end = json.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return json.substring(start, end + 1);
        }
        return json;
    }

    // ==================== PARSE HELPERS ====================

    double parseDouble(String value, double defaultValue) {
        if (value == null || value.isEmpty()) {
            return defaultValue;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    double parseDouble(Number value, double defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        return value.doubleValue();
    }

    // ==================== MOCK RESPONSE GENERATION ====================

    private String getMockResponse(String prompt) {
        if (prompt.contains("resume")) {
            return """
                    {
                      "fullName": "John Doe",
                      "email": "john.doe@email.com",
                      "phone": "+91 9876543210",
                      "currentLocation": "Bangalore, India",
                      "currentCompany": "Tech Corp",
                      "currentDesignation": "Senior Software Engineer",
                      "totalExperienceYears": 5,
                      "skills": ["Java", "Spring Boot", "Microservices", "AWS", "Docker"],
                      "education": [{"degree": "B.Tech", "institution": "IIT Delhi", "year": 2018}],
                      "certifications": ["AWS Solutions Architect"],
                      "languages": ["English", "Hindi"],
                      "summary": "Experienced software engineer with 5 years in backend development"
                    }
                    """;
        } else if (prompt.contains("match")) {
            String candidateName = extractBetween(prompt, "- Name: ", "\n");
            String jobTitle = extractBetween(prompt, "- Title: ", "\n");

            long seed = generateHashSeed(candidateName, jobTitle);
            int overallScore = generateOverallScore(seed);
            int skillsScore = generateComponentScore(seed, overallScore, 1);
            int experienceScore = generateComponentScore(seed, overallScore, 2);
            int educationScore = generateComponentScore(seed, overallScore, 3);
            int culturalFitScore = generateComponentScore(seed, overallScore, 4);

            List<String> strengths = generateStrengths(seed, overallScore);
            List<String> gaps = generateGaps(seed, overallScore);
            String recommendation = getRecommendationForScore(overallScore);

            String summary = String.format(
                "Candidate demonstrates %s match for the role. %s. %s",
                overallScore >= 75 ? "strong" : (overallScore >= 50 ? "moderate" : "limited"),
                !strengths.isEmpty() ? "Strengths include: " + String.join(", ", strengths) : "Some training may be required",
                !gaps.isEmpty() ? "Consider developing: " + String.join(", ", gaps) : "Well-rounded profile"
            );

            List<String> interviewFocus = generateFollowUpQuestions(seed);

            return String.format("""
                    {
                      "overallScore": %d,
                      "skillsScore": %d,
                      "experienceScore": %d,
                      "educationScore": %d,
                      "culturalFitScore": %d,
                      "strengths": %s,
                      "gaps": %s,
                      "recommendation": "%s",
                      "summary": "%s",
                      "interviewFocus": %s,
                      "aiModelVersion": "mock-v1"
                    }
                    """,
                overallScore,
                skillsScore,
                experienceScore,
                educationScore,
                culturalFitScore,
                toJsonArray(strengths),
                toJsonArray(gaps),
                recommendation,
                summary.replace("\"", "\\\""),
                toJsonArray(interviewFocus)
            );
        } else if (prompt.contains("screening summary") || prompt.contains("Screening")) {
            String candidateName = extractBetween(prompt, "- Name: ", "\n");
            String jobTitle = extractBetween(prompt, "- Title: ", "\n");

            long seed = generateHashSeed(candidateName, jobTitle);
            String fitLevel = generateFitLevel(seed);
            List<String> strengths = generateStrengths(seed, fitLevel.equals("HIGH") ? 80 : (fitLevel.equals("MEDIUM") ? 60 : 40));
            List<String> gaps = generateGaps(seed, fitLevel.equals("HIGH") ? 80 : (fitLevel.equals("MEDIUM") ? 60 : 40));
            List<String> followUpQuestions = generateFollowUpQuestions(seed);
            List<String> riskFlags = generateRiskFlags(seed, fitLevel);
            String recommendation = getScreeningRecommendationForFitLevel(fitLevel);

            String summary = String.format(
                "Candidate shows %s fit for this role. %s",
                fitLevel.toLowerCase(),
                fitLevel.equals("HIGH") ? "Ready to advance to next stage." : (fitLevel.equals("MEDIUM") ? "Further evaluation recommended." : "Consider alternative candidates.")
            );

            return String.format("""
                    {
                      "fitLevel": "%s",
                      "strengths": %s,
                      "gaps": %s,
                      "followUpQuestions": %s,
                      "riskFlags": %s,
                      "recommendation": "%s",
                      "summary": "%s",
                      "aiModelVersion": "mock-v1"
                    }
                    """,
                fitLevel,
                toJsonArray(strengths),
                toJsonArray(gaps),
                toJsonArray(followUpQuestions),
                toJsonArray(riskFlags),
                recommendation,
                summary.replace("\"", "\\\"")
            );
        } else if (prompt.contains("synthesizing feedback") || prompt.contains("Synthesize")) {
            return """
                    {
                      "candidateNarrative": "The candidate demonstrated strong technical abilities across multiple rounds, particularly in system design and problem solving. Communication skills were consistently noted as a strength. There is some disagreement on leadership readiness, with the technical panel seeing potential while the managerial round flagged limited people management experience.",
                      "themes": ["Strong technical foundation", "Good communication", "Leadership readiness uncertain", "Culture alignment positive"],
                      "agreements": ["Technically proficient for the role", "Strong communication and presentation skills", "Positive attitude and willingness to learn"],
                      "disagreements": ["Leadership readiness: Technical panel rated high, managerial round rated moderate", "Depth of system design knowledge varies by interviewer assessment"],
                      "missingData": ["No assessment of cross-functional collaboration", "Team dynamics and conflict resolution not tested"],
                      "openQuestions": ["How does the candidate handle ambiguity in project requirements?", "What is their experience leading teams of more than 3 people?"],
                      "recommendedNextStep": "Schedule a final panel round focusing on leadership scenarios and cross-functional collaboration before making an offer decision."
                    }
                    """;
        } else if (prompt.contains("job description")) {
            return """
                    {
                      "title": "Senior Software Engineer",
                      "summary": "We are looking for an experienced Software Engineer to join our team.",
                      "responsibilities": ["Design and develop scalable applications", "Mentor junior developers", "Participate in code reviews"],
                      "requirements": ["5+ years of experience", "Proficiency in Java/Python", "Experience with cloud platforms"],
                      "preferredQualifications": ["AWS certification", "Open source contributions"],
                      "benefits": ["Competitive salary", "Health insurance", "Flexible work hours"],
                      "fullDescription": "Join our innovative team as a Senior Software Engineer..."
                    }
                    """;
        } else {
            return """
                    {
                      "technicalQuestions": [
                        {"question": "Explain microservices architecture", "purpose": "Technical knowledge", "difficulty": "medium"},
                        {"question": "How do you handle database optimization?", "purpose": "Problem solving", "difficulty": "medium"}
                      ],
                      "behavioralQuestions": [
                        {"question": "Tell me about a challenging project", "competency": "Problem solving"}
                      ],
                      "situationalQuestions": [
                        {"question": "How would you handle a production outage?", "scenario": "Crisis management"}
                      ],
                      "culturalFitQuestions": [
                        {"question": "How do you prefer to receive feedback?", "value": "Growth mindset"}
                      ],
                      "roleSpecificQuestions": [
                        {"question": "What's your experience with agile methodologies?", "focus": "Process"}
                      ]
                    }
                    """;
        }
    }

    // ==================== MOCK GENERATION UTILITIES ====================

    private String extractBetween(String text, String startDelim, String endDelim) {
        if (text == null) return "";
        int start = text.indexOf(startDelim);
        if (start == -1) return "";
        start += startDelim.length();
        int end = text.indexOf(endDelim, start);
        if (end == -1) {
            return text.substring(start).trim();
        }
        return text.substring(start, end).trim();
    }

    private String toJsonArray(List<String> items) {
        if (items == null || items.isEmpty()) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            sb.append("\"").append(items.get(i).replace("\"", "\\\"")).append("\"");
            if (i < items.size() - 1) {
                sb.append(", ");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private long generateHashSeed(String candidateName, String jobTitle) {
        try {
            String combined = (candidateName != null ? candidateName : "") + "|" + (jobTitle != null ? jobTitle : "");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(combined.getBytes());
            long seed = 0;
            for (int i = 0; i < 8; i++) {
                seed = (seed << 8) | (hash[i] & 0xFF);
            }
            return seed;
        } catch (NoSuchAlgorithmException e) {
            String combined = (candidateName != null ? candidateName : "") + "|" + (jobTitle != null ? jobTitle : "");
            return combined.hashCode();
        }
    }

    private int generateOverallScore(long seed) {
        java.util.Random rand = new java.util.Random(seed);
        return 45 + rand.nextInt(51); // 45-95
    }

    private int generateComponentScore(long seed, int baseScore, int offset) {
        java.util.Random rand = new java.util.Random(seed + offset);
        int variation = rand.nextInt(21) - 10; // -10 to +10
        int score = baseScore + variation;
        return Math.max(0, Math.min(100, score));
    }

    private String getRecommendationForScore(int overallScore) {
        if (overallScore >= 80) {
            return "HIGHLY_RECOMMENDED";
        } else if (overallScore >= 65) {
            return "RECOMMENDED";
        } else if (overallScore >= 50) {
            return "CONSIDER";
        } else {
            return "NOT_RECOMMENDED";
        }
    }

    private String getScreeningRecommendationForFitLevel(String fitLevel) {
        if ("HIGH".equals(fitLevel)) {
            return "ADVANCE";
        } else if ("MEDIUM".equals(fitLevel)) {
            return "HOLD";
        } else {
            return "REJECT";
        }
    }

    private String generateFitLevel(long seed) {
        java.util.Random rand = new java.util.Random(seed);
        int fitRand = rand.nextInt(100);
        if (fitRand < 33) {
            return "HIGH";
        } else if (fitRand < 66) {
            return "MEDIUM";
        } else {
            return "LOW";
        }
    }

    private List<String> generateStrengths(long seed, int overallScore) {
        java.util.Random rand = new java.util.Random(seed);
        List<String> allStrengths = List.of(
            "Strong technical skills",
            "Relevant industry experience",
            "Excellent communication abilities",
            "Leadership potential",
            "Problem-solving aptitude",
            "Cultural fit",
            "Proven track record",
            "Quick learner",
            "Team collaboration skills",
            "Adaptability"
        );

        List<String> selected = new ArrayList<>();
        int count = overallScore > 75 ? 3 : (overallScore > 50 ? 2 : 1);
        for (int i = 0; i < count; i++) {
            selected.add(allStrengths.get(rand.nextInt(allStrengths.size())));
        }
        return selected;
    }

    private List<String> generateGaps(long seed, int overallScore) {
        java.util.Random rand = new java.util.Random(seed + 1000);
        List<String> allGaps = List.of(
            "Limited leadership experience",
            "No cloud platform certification",
            "Gap in specific technical domain",
            "Limited experience with modern frameworks",
            "Lacking advanced degree",
            "No international experience",
            "Limited project management background",
            "Unfamiliar with industry best practices",
            "Communication gaps",
            "Geographic mismatch"
        );

        List<String> selected = new ArrayList<>();
        int count = overallScore < 60 ? 3 : (overallScore < 80 ? 2 : 1);
        for (int i = 0; i < count; i++) {
            selected.add(allGaps.get(rand.nextInt(allGaps.size())));
        }
        return selected;
    }

    private List<String> generateFollowUpQuestions(long seed) {
        java.util.Random rand = new java.util.Random(seed + 2000);
        List<String> allQuestions = List.of(
            "Can you elaborate on your most recent project experience?",
            "How do you approach learning new technologies?",
            "Tell us about your team collaboration experience",
            "What are your career goals for the next 3-5 years?",
            "How do you handle pressure and tight deadlines?",
            "Describe your approach to problem-solving",
            "What attracted you to this role?",
            "How do you stay current with industry trends?",
            "Tell us about a time you faced conflict at work",
            "What is your approach to code quality and testing?"
        );

        List<String> selected = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            selected.add(allQuestions.get(rand.nextInt(allQuestions.size())));
        }
        return selected;
    }

    private List<String> generateRiskFlags(long seed, String fitLevel) {
        java.util.Random rand = new java.util.Random(seed + 3000);
        List<String> allRisks = List.of(
            "High salary expectations may not align with offer",
            "Short tenure at last position",
            "Geographic relocation required",
            "Skill gaps in critical areas",
            "Limited availability (long notice period)",
            "Technology stack mismatch",
            "Career progression expectations unclear"
        );

        List<String> selected = new ArrayList<>();
        if ("LOW".equals(fitLevel)) {
            for (int i = 0; i < 2; i++) {
                selected.add(allRisks.get(rand.nextInt(allRisks.size())));
            }
        }
        return selected;
    }
}
