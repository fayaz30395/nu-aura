package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Facade for AI-powered recruitment capabilities.
 *
 * <p>Delegates to three focused sub-services:
 * <ul>
 *   <li>{@link ResumeParserService} — resume parsing and text extraction</li>
 *   <li>{@link CandidateMatchingService} — scoring, ranking, and JD generation</li>
 *   <li>{@link InterviewGenerationService} — question generation and feedback synthesis</li>
 * </ul>
 *
 * <p>Preserves the original public API so that all existing callers (controllers, tests)
 * require no changes.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AIRecruitmentService {

    private final ResumeParserService resumeParser;
    private final CandidateMatchingService candidateMatching;
    private final InterviewGenerationService interviewGeneration;

    // ==================== RESUME PARSING ====================

    public ResumeParseResponse parseResume(String resumeText) {
        return resumeParser.parseResume(resumeText);
    }

    public ResumeParseResponse parseResumeFromUrl(String resumeUrl) {
        return resumeParser.parseResumeFromUrl(resumeUrl);
    }

    public ResumeParseResponse parseResumeFromFile(byte[] fileBytes, String fileName) {
        return resumeParser.parseResumeFromFile(fileBytes, fileName);
    }

    public ResumeParseResponse parseResumeFromBase64(String base64Content, String fileName) {
        return resumeParser.parseResumeFromBase64(base64Content, fileName);
    }

    // ==================== CANDIDATE MATCHING & SCREENING ====================

    @Transactional(readOnly = true)
    public CandidateMatchResponse calculateMatchScore(UUID candidateId, UUID jobOpeningId) {
        return candidateMatching.calculateMatchScore(candidateId, jobOpeningId);
    }

    @Transactional(readOnly = true)
    public CandidateScreeningSummaryResponse generateScreeningSummary(
            UUID candidateId, UUID jobOpeningId, String context) {
        return candidateMatching.generateScreeningSummary(candidateId, jobOpeningId, context);
    }

    public List<CandidateMatchResponse> rankCandidatesForJob(UUID jobOpeningId) {
        return candidateMatching.rankCandidatesForJob(jobOpeningId);
    }

    // ==================== JOB DESCRIPTION GENERATION ====================

    @Transactional(readOnly = true)
    public JobDescriptionResponse generateJobDescription(JobDescriptionRequest request) {
        return candidateMatching.generateJobDescription(request);
    }

    // ==================== INTERVIEW QUESTIONS ====================

    @Transactional(readOnly = true)
    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId, UUID candidateId) {
        return interviewGeneration.generateInterviewQuestions(jobOpeningId, candidateId);
    }

    @Transactional(readOnly = true)
    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId) {
        return interviewGeneration.generateInterviewQuestions(jobOpeningId);
    }

    // ==================== FEEDBACK SYNTHESIS ====================

    public FeedbackSynthesisResponse synthesizeInterviewFeedback(UUID candidateId, UUID jobOpeningId) {
        return interviewGeneration.synthesizeInterviewFeedback(candidateId, jobOpeningId);
    }
}
