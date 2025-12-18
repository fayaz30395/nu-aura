package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.ai.*;
import com.hrms.application.ai.service.AIRecruitmentService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * AI-powered recruitment endpoints for:
 * - Resume parsing and candidate data extraction
 * - Candidate-job matching and scoring
 * - AI-generated job descriptions
 * - Interview question suggestions
 */
@RestController
@RequestMapping("/api/v1/recruitment/ai")
@RequiredArgsConstructor
public class AIRecruitmentController {

    private final AIRecruitmentService aiRecruitmentService;

    // ==================== RESUME PARSING ====================

    /**
     * Parse resume text and extract structured candidate information
     */
    @PostMapping("/parse-resume")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<ResumeParseResponse> parseResume(@RequestBody ResumeParseRequest request) {
        ResumeParseResponse response;

        if (request.getResumeText() != null && !request.getResumeText().isEmpty()) {
            response = aiRecruitmentService.parseResume(request.getResumeText());
        } else if (request.getResumeUrl() != null && !request.getResumeUrl().isEmpty()) {
            response = aiRecruitmentService.parseResumeFromUrl(request.getResumeUrl());
        } else {
            response = ResumeParseResponse.builder()
                    .success(false)
                    .message("Please provide either resumeText or resumeUrl")
                    .build();
        }

        return ResponseEntity.ok(response);
    }

    // ==================== CANDIDATE MATCHING ====================

    /**
     * Calculate AI match score between a candidate and a job opening
     */
    @PostMapping("/match-score")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<CandidateMatchResponse> calculateMatchScore(
            @RequestParam UUID candidateId,
            @RequestParam UUID jobOpeningId) {
        CandidateMatchResponse response = aiRecruitmentService.calculateMatchScore(candidateId, jobOpeningId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get AI-ranked candidates for a job opening (sorted by match score)
     */
    @GetMapping("/ranked-candidates/{jobOpeningId}")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<List<CandidateMatchResponse>> getRankedCandidates(@PathVariable UUID jobOpeningId) {
        List<CandidateMatchResponse> rankedCandidates = aiRecruitmentService.rankCandidatesForJob(jobOpeningId);
        return ResponseEntity.ok(rankedCandidates);
    }

    // ==================== JOB DESCRIPTION GENERATION ====================

    /**
     * Generate AI-powered job description
     */
    @PostMapping("/generate-job-description")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<JobDescriptionResponse> generateJobDescription(@RequestBody JobDescriptionRequest request) {
        JobDescriptionResponse response = aiRecruitmentService.generateJobDescription(request);
        return ResponseEntity.ok(response);
    }

    // ==================== INTERVIEW QUESTIONS ====================

    /**
     * Generate interview questions for a job opening (optionally tailored to a specific candidate)
     */
    @GetMapping("/interview-questions/{jobOpeningId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<InterviewQuestionsResponse> generateInterviewQuestions(
            @PathVariable UUID jobOpeningId,
            @RequestParam(required = false) UUID candidateId) {
        InterviewQuestionsResponse response;

        if (candidateId != null) {
            response = aiRecruitmentService.generateInterviewQuestions(jobOpeningId, candidateId);
        } else {
            response = aiRecruitmentService.generateInterviewQuestions(jobOpeningId);
        }

        return ResponseEntity.ok(response);
    }
}
