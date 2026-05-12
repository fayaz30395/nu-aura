package com.hrms.application.ai.service;

import com.hrms.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Shared infrastructure helper for AI recruitment services.
 * Encapsulates OpenAI API calls, JSON extraction, and other utilities
 * shared across ResumeParserService, CandidateMatchingService, and
 * InterviewGenerationService.
 *
 * <p><strong>SECURITY / SAFETY:</strong> When the OpenAI API key is not
 * configured, this helper now throws {@link BusinessException} rather than
 * silently returning hardcoded mock data. Returning fabricated
 * "John Doe"-style content from a real AI endpoint is a wave-5 AI audit
 * blocker — recruiters could persist mock candidates as real matches.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
class AIRecruitmentHelper {

    /**
     * Standard EEOC / UK Equality Act guardrail clause appended to every
     * recruitment prompt. Prevents the model from inferring or commenting on
     * protected attributes (wave-5 AI #6 — gap between match-score and
     * screening-summary prompts).
     */
    static final String PROTECTED_ATTRIBUTE_GUARDRAIL = """

            IMPORTANT: Do NOT infer or comment on any protected attributes
            (age, gender, ethnicity, religion, health, marital status, national origin,
            disability, sexual orientation, etc.). Base your assessment ONLY on documented
            skills, experience, and qualifications.
            """;
    private final RestTemplate restTemplate;
    @Value("${ai.openai.api-key:}")
    private String openAiApiKey;
    @Value("${ai.openai.base-url:https://api.openai.com/v1}")
    private String openAiBaseUrl;
    @Value("${ai.openai.model:gpt-4o-mini}")
    private String openAiModel;

    // ==================== OPENAI ====================

    private static long toLong(Object raw) {
        if (raw instanceof Number num) {
            return num.longValue();
        }
        if (raw instanceof String str) {
            try {
                return Long.parseLong(str);
            } catch (NumberFormatException ignored) {
                return 0L;
            }
        }
        return 0L;
    }

    /**
     * Convenience wrapper that returns only the message content at the default
     * temperature. Maintained for callers that have not been migrated to the
     * full {@link #callOpenAI(String, double)} entry point.
     *
     * @param prompt user-role prompt content
     * @return assistant message content
     * @throws BusinessException if the API key is not configured (no silent mock fallback)
     */
    String callOpenAI(String prompt) {
        return callOpenAI(prompt, 0.7).getContent();
    }

    /**
     * Invoke OpenAI chat completions and return both the response content and the
     * token usage block (for {@code AiUsageLog} persistence).
     *
     * @param prompt      user-role prompt content
     * @param temperature sampling temperature — use 0.1 for structured JSON extraction,
     *                    0.2 for evaluative scoring, higher for open-ended generation
     * @return {@link ChatCompletionResult} carrying content + token counts
     * @throws BusinessException if the API key is not configured
     */
    ChatCompletionResult callOpenAI(String prompt, double temperature) {
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            // Wave-5 AI #1: do NOT fall back to fabricated mock data here.
            // The previous behavior returned hardcoded "John Doe" JSON that callers
            // would persist as if it were a real model response.
            throw new BusinessException(
                    "AI feature not available — OPENAI_API_KEY not configured");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openAiModel);
            requestBody.put("messages", List.of(
                    Map.of("role", "user", "content", prompt)));
            requestBody.put("temperature", temperature);
            requestBody.put("max_tokens", 2000);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    openAiBaseUrl + "/chat/completions",
                    HttpMethod.POST,
                    entity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            String content = "";
            long promptTokens = 0L;
            long completionTokens = 0L;
            long totalTokens = 0L;

            if (response.getBody() != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    if (message != null && message.get("content") != null) {
                        content = (String) message.get("content");
                    }
                }
                @SuppressWarnings("unchecked")
                Map<String, Object> usage = (Map<String, Object>) response.getBody().get("usage");
                if (usage != null) {
                    promptTokens = toLong(usage.get("prompt_tokens"));
                    completionTokens = toLong(usage.get("completion_tokens"));
                    totalTokens = toLong(usage.get("total_tokens"));
                }
            }

            return new ChatCompletionResult(content, promptTokens, completionTokens, totalTokens);
        } catch (BusinessException e) {
            // Already a domain-shaped failure — let it propagate.
            throw e;
        } catch (RuntimeException e) {
            // Wave-5 AI #1: do NOT fall back to fabricated mock data on transport
            // failures either. Callers must see real errors and surface them to
            // recruiters rather than persisting hallucinated match scores.
            log.error("Error calling OpenAI API: {}", e.getMessage());
            throw new BusinessException(
                    "AI provider call failed: " + e.getMessage());
        }
    }

    /**
     * Currently-configured upstream model identifier (e.g. {@code gpt-4o-mini}).
     * Exposed so callers can persist the real model name onto AiUsageLog and
     * CandidateMatchScore rather than a hardcoded version string.
     */
    String getModelName() {
        return openAiModel;
    }

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

    // ==================== JSON EXTRACTION ====================

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

    // ==================== PARSE HELPERS ====================

    double parseDouble(Number value, double defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        return value.doubleValue();
    }

    /**
     * Result of a chat-completion call: assistant message content plus token usage.
     * Token counts are best-effort — OpenAI does not always populate the usage block,
     * and self-hosted gateways may omit it entirely.
     */
    static class ChatCompletionResult {
        final String content;
        final long promptTokens;
        final long completionTokens;
        final long totalTokens;

        ChatCompletionResult(String content, long promptTokens, long completionTokens, long totalTokens) {
            this.content = content;
            this.promptTokens = promptTokens;
            this.completionTokens = completionTokens;
            this.totalTokens = totalTokens;
        }

        String getContent() {
            return content;
        }

        long getTotalTokens() {
            return totalTokens;
        }
    }

    // Mock fabrication path (getMockResponse + seeded score generators) was removed
    // in S3-G (wave-5 AI #1). It returned hardcoded "John Doe" resumes and SHA-256-
    // seeded match scores that callers persisted to CandidateMatchScore / Candidate
    // as if they were real model output. The new contract: when the API key is
    // unconfigured or the upstream call fails, throw BusinessException and let the
    // controller layer surface an "AI unavailable" error to the user.
}
