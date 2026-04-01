package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.Interview;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.InterviewRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AI-powered interview question generation and multi-round feedback synthesis.
 * Generates tailored question banks by category and synthesizes feedback
 * from completed interview rounds into cohesive hiring narratives.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InterviewGenerationService {

    private static final String AI_MODEL_VERSION = "gpt-4o-mini-v1";

    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final InterviewRepository interviewRepository;
    private final AIRecruitmentHelper aiHelper;
    private final ObjectMapper objectMapper;

    // ==================== PUBLIC API ====================

    /**
     * Generate interview questions based on job and candidate profile.
     */
    @Transactional(readOnly = true)
    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId, UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating interview questions for job {} and candidate {}", jobOpeningId, candidateId);

        JobOpening job = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        Candidate candidate = null;
        if (candidateId != null) {
            candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId).orElse(null);
        }

        String prompt = buildInterviewQuestionsPrompt(job, candidate);
        String aiResponse = aiHelper.callOpenAI(prompt);

        return parseInterviewQuestionsResponse(aiResponse);
    }

    /**
     * Generate interview questions for a job (generic, not candidate-specific).
     */
    @Transactional(readOnly = true)
    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId) {
        return generateInterviewQuestions(jobOpeningId, null);
    }

    /**
     * Synthesize interview feedback from multiple rounds for a candidate.
     * Fetches all COMPLETED interviews, clusters feedback by round and theme,
     * and produces a cohesive narrative with agreements, disagreements, and next steps.
     * This is guidance for hiring teams only and must not be used for automated decisions.
     */
    public FeedbackSynthesisResponse synthesizeInterviewFeedback(UUID candidateId, UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Synthesizing interview feedback for candidate {} and job {}", candidateId, jobOpeningId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        JobOpening job = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        List<Interview> interviews = interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId);

        // Filter to COMPLETED interviews with feedback for this job
        List<Interview> completedInterviews = interviews.stream()
                .filter(i -> i.getJobOpeningId().equals(jobOpeningId))
                .filter(i -> i.getStatus() == Interview.InterviewStatus.COMPLETED)
                .filter(i -> i.getFeedback() != null && !i.getFeedback().isBlank())
                .toList();

        if (completedInterviews.isEmpty()) {
            return FeedbackSynthesisResponse.builder()
                    .candidateId(candidateId)
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(jobOpeningId)
                    .jobTitle(job.getJobTitle())
                    .candidateNarrative("No completed interview feedback available for synthesis.")
                    .themes(List.of())
                    .agreements(List.of())
                    .disagreements(List.of())
                    .missingData(List.of("No completed interviews with feedback found"))
                    .openQuestions(List.of())
                    .recommendedNextStep("Schedule initial interviews")
                    .aiModelVersion(AI_MODEL_VERSION)
                    .build();
        }

        String prompt = buildFeedbackSynthesisPrompt(candidate, job, completedInterviews);
        String aiResponse = aiHelper.callOpenAI(prompt);

        return parseFeedbackSynthesisResponse(aiResponse, candidate, job);
    }

    // ==================== PRIVATE HELPERS ====================

    private String buildInterviewQuestionsPrompt(JobOpening job, Candidate candidate) {
        String candidateInfo = "";
        if (candidate != null) {
            candidateInfo = """

                    CANDIDATE BACKGROUND:
                    - Current Role: %s at %s
                    - Experience: %s years
                    - Focus areas based on their profile to probe
                    """.formatted(
                    candidate.getCurrentDesignation() != null ? candidate.getCurrentDesignation() : "Not specified",
                    candidate.getCurrentCompany() != null ? candidate.getCurrentCompany() : "Not specified",
                    candidate.getTotalExperience() != null ? candidate.getTotalExperience() : "Not specified");
        }

        return """
                You are an expert interviewer. Generate interview questions for this role.

                JOB:
                - Title: %s
                - Description: %s
                - Requirements: %s
                - Skills: %s
                %s

                Generate questions in this JSON format:
                {
                  "technicalQuestions": [
                    {"question": "string", "purpose": "what it evaluates", "difficulty": "easy|medium|hard"}
                  ],
                  "behavioralQuestions": [
                    {"question": "string", "competency": "what competency it tests"}
                  ],
                  "situationalQuestions": [
                    {"question": "string", "scenario": "brief scenario description"}
                  ],
                  "culturalFitQuestions": [
                    {"question": "string", "value": "company value it relates to"}
                  ],
                  "roleSpecificQuestions": [
                    {"question": "string", "focus": "specific role aspect"}
                  ]
                }

                Generate 3-5 questions per category. Return ONLY valid JSON.
                """.formatted(
                job.getJobTitle(),
                job.getJobDescription() != null ? job.getJobDescription() : "Not specified",
                job.getRequirements() != null ? job.getRequirements() : "Not specified",
                job.getSkillsRequired() != null ? job.getSkillsRequired() : "Not specified",
                candidateInfo);
    }

    private String buildFeedbackSynthesisPrompt(
            Candidate candidate, JobOpening job, List<Interview> interviews) {
        StringBuilder feedbackSection = new StringBuilder();
        for (Interview interview : interviews) {
            feedbackSection.append("""

                    --- Interview Round: %s (%s) ---
                    Rating: %s/5
                    Result: %s
                    Feedback: %s
                    Notes: %s
                    """.formatted(
                    interview.getInterviewRound() != null ? interview.getInterviewRound().name() : "UNKNOWN",
                    interview.getInterviewType() != null ? interview.getInterviewType().name() : "UNKNOWN",
                    interview.getRating() != null ? interview.getRating() : "N/A",
                    interview.getResult() != null ? interview.getResult().name() : "PENDING",
                    interview.getFeedback() != null ? interview.getFeedback() : "No feedback provided",
                    interview.getNotes() != null ? interview.getNotes() : "No notes"));
        }

        return """
                You are an expert HR interviewer synthesizing feedback from multiple interview rounds.
                This synthesis is for the hiring team only and MUST NOT be used for automated hiring decisions.

                Focus on evidence from the data provided. Do NOT infer or comment on any protected
                attributes (age, gender, ethnicity, religion, health, marital status, etc.).

                JOB: %s
                CANDIDATE: %s

                INTERVIEW FEEDBACK (%d rounds):
                %s

                Provide synthesis in this JSON format:
                {
                  "candidateNarrative": "A cohesive 3-5 sentence narrative of what the team has learned about this candidate so far",
                  "themes": ["theme1", "theme2", "theme3"],
                  "agreements": ["point where interviewers agree 1", "point 2"],
                  "disagreements": ["conflicting signal 1", "conflicting signal 2"],
                  "missingData": ["competency or area not yet assessed 1", "area 2"],
                  "openQuestions": ["remaining question 1", "remaining question 2"],
                  "recommendedNextStep": "Specific recommended next action for the hiring team"
                }

                Return ONLY valid JSON.
                """.formatted(
                job.getJobTitle(),
                candidate.getFullName(),
                interviews.size(),
                feedbackSection);
    }

    private InterviewQuestionsResponse parseInterviewQuestionsResponse(String aiResponse) {
        try {
            String json = aiHelper.extractJson(aiResponse);

            AIInterviewQuestionsDTO dto = objectMapper.readValue(json, AIInterviewQuestionsDTO.class);

            InterviewQuestionsResponse.InterviewQuestionsResponseBuilder builder =
                    InterviewQuestionsResponse.builder();
            builder.success(true);
            builder.rawJson(json);

            if (dto.getTechnicalQuestions() != null) {
                List<InterviewQuestionsResponse.TechnicalQuestion> technicalQuestions = new ArrayList<>();
                for (AIInterviewQuestionsDTO.TechnicalQuestion q : dto.getTechnicalQuestions()) {
                    technicalQuestions.add(InterviewQuestionsResponse.TechnicalQuestion.builder()
                            .question(q.getQuestion())
                            .purpose(q.getPurpose())
                            .difficulty(q.getDifficulty())
                            .build());
                }
                builder.technicalQuestions(technicalQuestions);
            }

            if (dto.getBehavioralQuestions() != null) {
                List<InterviewQuestionsResponse.BehavioralQuestion> behavioralQuestions = new ArrayList<>();
                for (AIInterviewQuestionsDTO.BehavioralQuestion q : dto.getBehavioralQuestions()) {
                    behavioralQuestions.add(InterviewQuestionsResponse.BehavioralQuestion.builder()
                            .question(q.getQuestion())
                            .competency(q.getCompetency())
                            .build());
                }
                builder.behavioralQuestions(behavioralQuestions);
            }

            if (dto.getSituationalQuestions() != null) {
                List<InterviewQuestionsResponse.SituationalQuestion> situationalQuestions = new ArrayList<>();
                for (AIInterviewQuestionsDTO.SituationalQuestion q : dto.getSituationalQuestions()) {
                    situationalQuestions.add(InterviewQuestionsResponse.SituationalQuestion.builder()
                            .question(q.getQuestion())
                            .scenario(q.getScenario())
                            .build());
                }
                builder.situationalQuestions(situationalQuestions);
            }

            if (dto.getCulturalFitQuestions() != null) {
                List<InterviewQuestionsResponse.CulturalFitQuestion> culturalFitQuestions = new ArrayList<>();
                for (AIInterviewQuestionsDTO.CulturalFitQuestion q : dto.getCulturalFitQuestions()) {
                    culturalFitQuestions.add(InterviewQuestionsResponse.CulturalFitQuestion.builder()
                            .question(q.getQuestion())
                            .value(q.getValue())
                            .build());
                }
                builder.culturalFitQuestions(culturalFitQuestions);
            }

            if (dto.getRoleSpecificQuestions() != null) {
                List<InterviewQuestionsResponse.RoleSpecificQuestion> roleSpecificQuestions = new ArrayList<>();
                for (AIInterviewQuestionsDTO.RoleSpecificQuestion q : dto.getRoleSpecificQuestions()) {
                    roleSpecificQuestions.add(InterviewQuestionsResponse.RoleSpecificQuestion.builder()
                            .question(q.getQuestion())
                            .focus(q.getFocus())
                            .build());
                }
                builder.roleSpecificQuestions(roleSpecificQuestions);
            }

            return builder.build();
        } catch (JsonProcessingException e) {
            log.error("Error parsing interview questions response: {}", e.getMessage());
            return InterviewQuestionsResponse.builder()
                    .success(false)
                    .message("Error generating questions: " + e.getMessage())
                    .build();
        }
    }

    private FeedbackSynthesisResponse parseFeedbackSynthesisResponse(
            String aiResponse, Candidate candidate, JobOpening job) {
        try {
            String json = aiHelper.extractJson(aiResponse);

            AIFeedbackSynthesisDTO dto = objectMapper.readValue(json, AIFeedbackSynthesisDTO.class);

            return FeedbackSynthesisResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .candidateNarrative(dto.getCandidateNarrative())
                    .themes(dto.getThemes())
                    .agreements(dto.getAgreements())
                    .disagreements(dto.getDisagreements())
                    .missingData(dto.getMissingData())
                    .openQuestions(dto.getOpenQuestions())
                    .recommendedNextStep(dto.getRecommendedNextStep())
                    .aiModelVersion(AI_MODEL_VERSION)
                    .build();
        } catch (JsonProcessingException e) {
            log.error("Error parsing feedback synthesis response: {}", e.getMessage());
            return FeedbackSynthesisResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .candidateNarrative("Unable to synthesize feedback - " + e.getMessage())
                    .themes(List.of())
                    .agreements(List.of())
                    .disagreements(List.of())
                    .missingData(List.of())
                    .openQuestions(List.of())
                    .recommendedNextStep("Review feedback manually")
                    .aiModelVersion(AI_MODEL_VERSION)
                    .build();
        }
    }
}
