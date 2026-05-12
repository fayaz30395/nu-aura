package com.nulogic.application.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.recruitment.dto.ai.*;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.ai.AiUsageLog;
import com.nulogic.domain.ai.CandidateMatchScore;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.domain.recruitment.JobOpening;
import com.nulogic.infrastructure.ai.repository.AiUsageLogRepository;
import com.nulogic.infrastructure.ai.repository.CandidateMatchScoreRepository;
import com.nulogic.infrastructure.recruitment.repository.CandidateRepository;
import com.nulogic.infrastructure.recruitment.repository.JobOpeningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * AI-powered candidate matching, screening, and job description generation.
 * Calculates fit scores between candidates and job openings, ranks candidate
 * pools, generates screening summaries, and produces AI-drafted job descriptions.
 *
 * <p><strong>SAFETY (wave-5 AI #1, #2, #5, #6, #8):</strong></p>
 * <ul>
 *   <li>When {@code OPENAI_API_KEY} is not configured, throws
 *       {@link com.nulogic.common.exception.BusinessException} rather than returning
 *       deterministic seeded "AI" scores (those were indistinguishable from real
 *       model output once persisted onto {@code CandidateMatchScore}).</li>
 *   <li>The stored model identifier is now the runtime model name, not the
 *       hardcoded {@code "gpt-4o-mini-v1"} placeholder.</li>
 *   <li>Every prompt — including {@code buildMatchingPrompt} — carries the
 *       protected-attribute guardrail (EEOC / UK Equality Act).</li>
 *   <li>Match scoring uses temperature 0.2 to keep ratings reproducible.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CandidateMatchingService {

    /**
     * AiUsageLog feature keys for the three entrypoints in this service.
     */
    private static final String FEATURE_MATCH_SCORE = "match_score";
    private static final String FEATURE_SCREENING_SUMMARY = "screening_summary";
    private static final String FEATURE_JOB_DESCRIPTION = "job_description";

    /**
     * Temperature for match-score and screening-summary prompts. These are
     * evaluative tasks — same inputs should yield substantially the same scores.
     */
    private static final double MATCH_TEMPERATURE = 0.2;

    /**
     * Job description generation is a creative writing task; default temperature is fine.
     */
    private static final double JD_TEMPERATURE = 0.7;

    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final CandidateMatchScoreRepository matchScoreRepository;
    private final AIRecruitmentHelper aiHelper;
    private final ObjectMapper objectMapper;
    private final AiUsageLogRepository aiUsageLogRepository;

    /**
     * Runtime upstream model name. Replaces the previous hardcoded
     * {@code AI_MODEL_VERSION = "gpt-4o-mini-v1"} constant so the stored value
     * reflects the model that actually scored the candidate.
     */
    @Value("${ai.openai.model:gpt-4o-mini}")
    private String aiModelName;

    // ==================== PUBLIC API ====================

    /**
     * Calculate match score between a candidate and a job opening using AI.
     *
     * @throws com.nulogic.common.exception.BusinessException if the OpenAI API key is not configured
     */
    @Transactional(readOnly = true)
    public CandidateMatchResponse calculateMatchScore(UUID candidateId, UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Calculating match score for candidate {} and job {}", candidateId, jobOpeningId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        JobOpening job = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        String prompt = buildMatchingPrompt(candidate, job);
        AIRecruitmentHelper.ChatCompletionResult ai = aiHelper.callOpenAI(prompt, MATCH_TEMPERATURE);
        recordUsage(FEATURE_MATCH_SCORE, ai);

        CandidateMatchResponse response = parseMatchResponse(ai.getContent(), candidate, job);

        saveMatchScore(candidate, job, response);

        return response;
    }

    /**
     * Generate a structured screening summary for a candidate against a job opening.
     * This is intended as human guidance only and must not be used for automated decisions.
     *
     * @throws com.nulogic.common.exception.BusinessException if the OpenAI API key is not configured
     */
    @Transactional(readOnly = true)
    public CandidateScreeningSummaryResponse generateScreeningSummary(
            UUID candidateId, UUID jobOpeningId, String context) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating screening summary for candidate {} and job {}", candidateId, jobOpeningId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        JobOpening job = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        String prompt = buildScreeningSummaryPrompt(candidate, job, context);
        AIRecruitmentHelper.ChatCompletionResult ai = aiHelper.callOpenAI(prompt, MATCH_TEMPERATURE);
        recordUsage(FEATURE_SCREENING_SUMMARY, ai);

        return parseScreeningSummaryResponse(ai.getContent(), candidate, job);
    }

    /**
     * Get AI-ranked candidates for a job opening.
     */
    public List<CandidateMatchResponse> rankCandidatesForJob(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Ranking candidates for job {}", jobOpeningId);

        jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        List<Candidate> candidates = candidateRepository.findByTenantIdAndJobOpeningId(tenantId, jobOpeningId);

        List<CandidateMatchResponse> rankedCandidates = new ArrayList<>();

        for (Candidate candidate : candidates) {
            try {
                CandidateMatchResponse match = calculateMatchScore(candidate.getId(), jobOpeningId);
                rankedCandidates.add(match);
            } catch (RuntimeException e) {
                log.error("Error calculating match for candidate {}: {}", candidate.getId(), e.getMessage());
            }
        }

        // Sort by overall score descending
        rankedCandidates.sort((a, b) -> Double.compare(b.getOverallScore(), a.getOverallScore()));

        return rankedCandidates;
    }

    /**
     * Generate a job description using AI.
     *
     * @throws com.nulogic.common.exception.BusinessException if the OpenAI API key is not configured
     */
    @Transactional(readOnly = true)
    public JobDescriptionResponse generateJobDescription(JobDescriptionRequest request) {
        log.info("Generating job description for: {}", request.getJobTitle());

        String prompt = buildJobDescriptionPrompt(request);
        AIRecruitmentHelper.ChatCompletionResult ai = aiHelper.callOpenAI(prompt, JD_TEMPERATURE);
        recordUsage(FEATURE_JOB_DESCRIPTION, ai);

        return parseJobDescriptionResponse(ai.getContent(), request);
    }

    // ==================== PRIVATE HELPERS ====================

    private String buildMatchingPrompt(Candidate candidate, JobOpening job) {
        // Wave-5 AI #6: the match-score prompt previously lacked the EEOC /
        // Equality-Act guardrail that buildScreeningSummaryPrompt already had.
        // The model was free to weight protected attributes into the numerical
        // score, which then drove ranked candidate lists. Adding the shared
        // guardrail clause closes that gap.
        return """
                You are an expert HR recruiter. Analyze the match between this candidate and job opening.
                %s
                JOB OPENING:
                - Title: %s
                - Description: %s
                - Requirements: %s
                - Required Skills: %s
                - Experience Required: %s
                - Location: %s

                CANDIDATE:
                - Name: %s
                - Current Role: %s at %s
                - Total Experience: %s years
                - Location: %s
                - Current CTC: %s
                - Expected CTC: %s
                - Notice Period: %s days

                Provide analysis in this JSON format:
                {
                  "overallScore": number (0-100),
                  "skillsScore": number (0-100),
                  "experienceScore": number (0-100),
                  "educationScore": number (0-100),
                  "culturalFitScore": number (0-100),
                  "strengths": ["strength1", "strength2"],
                  "gaps": ["gap1", "gap2"],
                  "recommendation": "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "CONSIDER" | "NOT_RECOMMENDED",
                  "summary": "Brief assessment summary",
                  "interviewFocus": ["area1", "area2"]
                }

                Return ONLY valid JSON.
                """.formatted(
                AIRecruitmentHelper.PROTECTED_ATTRIBUTE_GUARDRAIL,
                job.getJobTitle(),
                job.getJobDescription() != null ? job.getJobDescription() : "Not specified",
                job.getRequirements() != null ? job.getRequirements() : "Not specified",
                job.getSkillsRequired() != null ? job.getSkillsRequired() : "Not specified",
                job.getExperienceRequired() != null ? job.getExperienceRequired() : "Not specified",
                job.getLocation() != null ? job.getLocation() : "Not specified",
                candidate.getFullName(),
                candidate.getCurrentDesignation() != null ? candidate.getCurrentDesignation() : "Not specified",
                candidate.getCurrentCompany() != null ? candidate.getCurrentCompany() : "Not specified",
                candidate.getTotalExperience() != null ? candidate.getTotalExperience() : "Not specified",
                candidate.getCurrentLocation() != null ? candidate.getCurrentLocation() : "Not specified",
                candidate.getCurrentCtc() != null ? candidate.getCurrentCtc() : "Not specified",
                candidate.getExpectedCtc() != null ? candidate.getExpectedCtc() : "Not specified",
                candidate.getNoticePeriodDays() != null ? candidate.getNoticePeriodDays() : "Not specified");
    }

    private String buildScreeningSummaryPrompt(Candidate candidate, JobOpening job, String context) {
        String extraContext = (context != null && !context.isBlank())
                ? """

                ADDITIONAL CONTEXT FROM RECRUITER:
                %s
                """.formatted(context)
                : "";

        // Use the shared protected-attribute guardrail so every recruitment
        // prompt enforces the same EEOC / Equality-Act language (wave-5 AI #6).
        return """
                You are an expert recruiter. Create a structured screening summary for this candidate
                against the given job opening. This summary is for human recruiters only and MUST NOT be used
                for automated hiring decisions.
                %s
                JOB OPENING:
                - Title: %s
                - Description: %s
                - Requirements: %s
                - Required Skills: %s
                - Experience Required: %s
                - Location: %s

                CANDIDATE:
                - Name: %s
                - Current Role: %s at %s
                - Total Experience: %s years
                - Location: %s
                - Current CTC: %s
                - Expected CTC: %s
                - Notice Period: %s days

                %s

                Provide analysis in this JSON format:
                {
                  "fitLevel": "HIGH" | "MEDIUM" | "LOW",
                  "strengths": ["strength1", "strength2"],
                  "gaps": ["gap1", "gap2"],
                  "followUpQuestions": ["question1", "question2"],
                  "riskFlags": ["risk1", "risk2"],
                  "recommendation": "ADVANCE" | "HOLD" | "REJECT",
                  "summary": "Brief, evidence-based screening summary"
                }

                Return ONLY valid JSON.
                """.formatted(
                AIRecruitmentHelper.PROTECTED_ATTRIBUTE_GUARDRAIL,
                job.getJobTitle(),
                job.getJobDescription() != null ? job.getJobDescription() : "Not specified",
                job.getRequirements() != null ? job.getRequirements() : "Not specified",
                job.getSkillsRequired() != null ? job.getSkillsRequired() : "Not specified",
                job.getExperienceRequired() != null ? job.getExperienceRequired() : "Not specified",
                job.getLocation() != null ? job.getLocation() : "Not specified",
                candidate.getFullName(),
                candidate.getCurrentDesignation() != null ? candidate.getCurrentDesignation() : "Not specified",
                candidate.getCurrentCompany() != null ? candidate.getCurrentCompany() : "Not specified",
                candidate.getTotalExperience() != null ? candidate.getTotalExperience() : "Not specified",
                candidate.getCurrentLocation() != null ? candidate.getCurrentLocation() : "Not specified",
                candidate.getCurrentCtc() != null ? candidate.getCurrentCtc() : "Not specified",
                candidate.getExpectedCtc() != null ? candidate.getExpectedCtc() : "Not specified",
                candidate.getNoticePeriodDays() != null ? candidate.getNoticePeriodDays() : "Not specified",
                extraContext);
    }

    private String buildJobDescriptionPrompt(JobDescriptionRequest request) {
        return """
                You are an expert HR professional. Generate a compelling job description.

                Job Details:
                - Title: %s
                - Department: %s
                - Location: %s
                - Employment Type: %s
                - Experience Range: %s
                - Key Skills: %s
                - Industry: %s
                - Company Culture: %s

                Generate a professional job description in this JSON format:
                {
                  "title": "Enhanced job title if needed",
                  "summary": "2-3 sentence job summary",
                  "responsibilities": ["responsibility1", "responsibility2", ...],
                  "requirements": ["requirement1", "requirement2", ...],
                  "preferredQualifications": ["qualification1", "qualification2", ...],
                  "benefits": ["benefit1", "benefit2", ...],
                  "aboutCompany": "Brief company description placeholder",
                  "fullDescription": "Complete formatted job description text"
                }

                Return ONLY valid JSON.
                """.formatted(
                request.getJobTitle(),
                request.getDepartment() != null ? request.getDepartment() : "Not specified",
                request.getLocation() != null ? request.getLocation() : "Remote/Flexible",
                request.getEmploymentType() != null ? request.getEmploymentType() : "Full-time",
                request.getExperienceRange() != null ? request.getExperienceRange() : "Not specified",
                request.getKeySkills() != null ? String.join(", ", request.getKeySkills()) : "Not specified",
                request.getIndustry() != null ? request.getIndustry() : "Technology",
                request.getCompanyCulture() != null ? request.getCompanyCulture() : "Innovative and collaborative");
    }

    private CandidateMatchResponse parseMatchResponse(String aiResponse, Candidate candidate, JobOpening job) {
        try {
            String json = aiHelper.extractJson(aiResponse);

            AIMatchResponseDTO dto = objectMapper.readValue(json, AIMatchResponseDTO.class);

            return CandidateMatchResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .overallScore(aiHelper.parseDouble(dto.getOverallScore(), 0))
                    .skillsScore(aiHelper.parseDouble(dto.getSkillsScore(), 0))
                    .experienceScore(aiHelper.parseDouble(dto.getExperienceScore(), 0))
                    .educationScore(aiHelper.parseDouble(dto.getEducationScore(), 0))
                    .culturalFitScore(aiHelper.parseDouble(dto.getCulturalFitScore(), 0))
                    .strengths(dto.getStrengths())
                    .gaps(dto.getGaps())
                    .recommendation(dto.getRecommendation())
                    .summary(dto.getSummary())
                    .interviewFocus(dto.getInterviewFocus())
                    .aiModelVersion(aiModelName)
                    .build();
        } catch (JsonProcessingException e) {
            log.error("Error parsing match response: {}", e.getMessage());
            return CandidateMatchResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .overallScore(0)
                    .recommendation("CONSIDER")
                    .summary("Unable to analyze - " + e.getMessage())
                    .build();
        }
    }

    private CandidateScreeningSummaryResponse parseScreeningSummaryResponse(
            String aiResponse, Candidate candidate, JobOpening job) {
        try {
            String json = aiHelper.extractJson(aiResponse);

            AIScreeningSummaryDTO dto = objectMapper.readValue(json, AIScreeningSummaryDTO.class);

            return CandidateScreeningSummaryResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .fitLevel(dto.getFitLevel())
                    .strengths(dto.getStrengths())
                    .gaps(dto.getGaps())
                    .followUpQuestions(dto.getFollowUpQuestions())
                    .riskFlags(dto.getRiskFlags())
                    .recommendation(dto.getRecommendation())
                    .summary(dto.getSummary())
                    .aiModelVersion(aiModelName)
                    .build();
        } catch (JsonProcessingException e) {
            log.error("Error parsing screening summary response: {}", e.getMessage());
            return CandidateScreeningSummaryResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .fitLevel("LOW")
                    .summary("Unable to generate screening summary - " + e.getMessage())
                    .aiModelVersion(aiModelName)
                    .build();
        }
    }

    private JobDescriptionResponse parseJobDescriptionResponse(
            String aiResponse, JobDescriptionRequest request) {
        try {
            String json = aiHelper.extractJson(aiResponse);

            AIJobDescriptionDTO dto = objectMapper.readValue(json, AIJobDescriptionDTO.class);

            return JobDescriptionResponse.builder()
                    .success(true)
                    .title(dto.getTitle())
                    .summary(dto.getSummary())
                    .responsibilities(dto.getResponsibilities())
                    .requirements(dto.getRequirements())
                    .preferredQualifications(dto.getPreferredQualifications())
                    .benefits(dto.getBenefits())
                    .fullDescription(dto.getFullDescription())
                    .build();
        } catch (JsonProcessingException e) {
            log.error("Error parsing job description response: {}", e.getMessage());
            return JobDescriptionResponse.builder()
                    .success(false)
                    .message("Error generating job description: " + e.getMessage())
                    .build();
        }
    }

    private void saveMatchScore(Candidate candidate, JobOpening job, CandidateMatchResponse response) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Optional<CandidateMatchScore> existing = matchScoreRepository
                .findByCandidateIdAndJobOpeningIdAndTenantId(candidate.getId(), job.getId(), tenantId);

        CandidateMatchScore score;
        if (existing.isPresent()) {
            score = existing.get();
        } else {
            score = new CandidateMatchScore();
            score.setId(UUID.randomUUID());
            score.setTenantId(tenantId);
            score.setCandidateId(candidate.getId());
            score.setJobOpeningId(job.getId());
        }

        score.setOverallMatchScore(response.getOverallScore());
        score.setSkillsMatchScore(response.getSkillsScore());
        score.setExperienceMatchScore(response.getExperienceScore());
        score.setEducationMatchScore(response.getEducationScore());
        score.setCulturalFitScore(response.getCulturalFitScore());
        score.setStrengths(String.join(",", response.getStrengths() != null ? response.getStrengths() : List.of()));
        score.setGaps(String.join(",", response.getGaps() != null ? response.getGaps() : List.of()));
        score.setAiModelVersion(aiModelName);

        try {
            score.setRecommendation(CandidateMatchScore.Recommendation.valueOf(response.getRecommendation()));
        } catch (IllegalArgumentException e) {
            score.setRecommendation(CandidateMatchScore.Recommendation.CONSIDER);
        }

        matchScoreRepository.save(score);
    }

    /**
     * Best-effort persistence of a row to {@code ai_usage_log}. Failures must not
     * propagate — usage logging is observability, not part of the match-score
     * user-facing contract.
     */
    private void recordUsage(String featureName, AIRecruitmentHelper.ChatCompletionResult ai) {
        try {
            UUID tenantId = TenantContext.getCurrentTenant();
            if (tenantId == null) {
                return;
            }
            AiUsageLog usage = AiUsageLog.builder()
                    .feature(featureName)
                    .modelName(aiModelName)
                    .tokensUsed((int) ai.getTotalTokens())
                    .build();
            usage.setTenantId(tenantId);
            aiUsageLogRepository.save(usage);
        } catch (RuntimeException e) {
            log.warn("Failed to persist AI usage log for {}: {}", featureName, e.getMessage());
        }
    }
}
