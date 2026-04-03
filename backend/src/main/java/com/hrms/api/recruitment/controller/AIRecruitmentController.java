package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.ai.*;
import com.hrms.application.ai.service.AIRecruitmentService;
import com.hrms.application.recruitment.service.RecruitmentManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;

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
@Slf4j
public class AIRecruitmentController {

    private final AIRecruitmentService aiRecruitmentService;
    private final RecruitmentManagementService recruitmentManagementService;

    // ==================== RESUME PARSING ====================

    /**
     * Parse resume text and extract structured candidate information.
     * Supports plain text, resume URLs, and base64-encoded file content (PDF, DOCX, etc.)
     */
    @PostMapping("/parse-resume")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<ResumeParseResponse> parseResume(@Valid @RequestBody ResumeParseRequest request) {
        ResumeParseResponse response;

        if (request.getResumeText() != null && !request.getResumeText().isEmpty()) {
            log.info("Parsing resume from text");
            response = aiRecruitmentService.parseResume(request.getResumeText());
        } else if (request.getFileBase64() != null && !request.getFileBase64().isEmpty()) {
            log.info("Parsing resume from base64 file: {}", request.getFileName());
            String fileName = request.getFileName() != null ? request.getFileName() : "resume";
            response = aiRecruitmentService.parseResumeFromBase64(request.getFileBase64(), fileName);
        } else if (request.getResumeUrl() != null && !request.getResumeUrl().isEmpty()) {
            log.info("Parsing resume from URL: {}", request.getResumeUrl());
            response = aiRecruitmentService.parseResumeFromUrl(request.getResumeUrl());
        } else {
            response = ResumeParseResponse.builder()
                    .success(false)
                    .message("Please provide either resumeText, resumeUrl, or fileBase64")
                    .build();
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Parse resume from a multipart file upload (PDF, DOCX, etc.)
     * Binary formats are automatically handled using Apache Tika.
     */
    @PostMapping("/parse-resume/upload")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<ResumeParseResponse> parseResumeFromUpload(@RequestParam("file") MultipartFile file) {
        log.info("Parsing uploaded resume file: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        // Validate file size (10MB limit)
        if (file.getSize() > 10_000_000) {
            ResumeParseResponse response = ResumeParseResponse.builder()
                    .success(false)
                    .message("File size exceeds 10MB limit")
                    .build();
            return ResponseEntity.ok(response);
        }

        // Validate file is not empty
        if (file.isEmpty()) {
            ResumeParseResponse response = ResumeParseResponse.builder()
                    .success(false)
                    .message("File is empty")
                    .build();
            return ResponseEntity.ok(response);
        }

        try {
            byte[] fileBytes = file.getBytes();
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume";
            ResumeParseResponse response = aiRecruitmentService.parseResumeFromFile(fileBytes, fileName);
            return ResponseEntity.ok(response);

        } catch (Exception e) { // Intentional broad catch — controller error boundary
            log.error("Error reading uploaded file: {}", e.getMessage());
            ResumeParseResponse response = ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to read file: " + e.getMessage())
                    .build();
            return ResponseEntity.ok(response);
        }
    }

    // ==================== CANDIDATE MATCHING & SCREENING ====================

    /**
     * Calculate AI match score between a candidate and a job opening
     */
    @PostMapping("/match-score")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<CandidateMatchResponse> calculateMatchScore(
            @RequestParam UUID candidateId,
            @RequestParam UUID jobOpeningId) {
        // Validate scope access to both candidate and job opening
        recruitmentManagementService.getCandidateById(candidateId);
        recruitmentManagementService.getJobOpeningById(jobOpeningId);

        CandidateMatchResponse response = aiRecruitmentService.calculateMatchScore(candidateId, jobOpeningId);
        return ResponseEntity.ok(response);
    }

    /**
     * Generate a structured AI-powered screening summary for a candidate
     * against a specific job opening. This is guidance for recruiters only
     * and must not be used for automated decisions.
     */
    @PostMapping("/screening-summary")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<CandidateScreeningSummaryResponse> generateScreeningSummary(
            @Valid @RequestBody CandidateScreeningSummaryRequest request) {

        // Validate scope access to both candidate and job opening
        recruitmentManagementService.getCandidateById(request.getCandidateId());
        recruitmentManagementService.getJobOpeningById(request.getJobOpeningId());

        CandidateScreeningSummaryResponse response = aiRecruitmentService.generateScreeningSummary(
                request.getCandidateId(),
                request.getJobOpeningId(),
                request.getContext()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Get AI-ranked candidates for a job opening (sorted by match score)
     */
    @GetMapping("/ranked-candidates/{jobOpeningId}")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<List<CandidateMatchResponse>> getRankedCandidates(@PathVariable UUID jobOpeningId) {
        // Validate scope access to job opening
        recruitmentManagementService.getJobOpeningById(jobOpeningId);

        List<CandidateMatchResponse> rankedCandidates = aiRecruitmentService.rankCandidatesForJob(jobOpeningId);
        return ResponseEntity.ok(rankedCandidates);
    }

    // ==================== JOB DESCRIPTION GENERATION ====================

    /**
     * Generate AI-powered job description
     */
    @PostMapping("/generate-job-description")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<JobDescriptionResponse> generateJobDescription(@Valid @RequestBody JobDescriptionRequest request) {
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
        // Validate scope access to job opening
        recruitmentManagementService.getJobOpeningById(jobOpeningId);

        // Validate scope access to candidate if provided
        if (candidateId != null) {
            recruitmentManagementService.getCandidateById(candidateId);
        }

        InterviewQuestionsResponse response;
        if (candidateId != null) {
            response = aiRecruitmentService.generateInterviewQuestions(jobOpeningId, candidateId);
        } else {
            response = aiRecruitmentService.generateInterviewQuestions(jobOpeningId);
        }

        return ResponseEntity.ok(response);
    }

    // ==================== FEEDBACK SYNTHESIS ====================

    /**
     * Synthesize interview feedback from multiple rounds for a candidate.
     * Clusters feedback by competency and theme, surfaces agreements
     * and disagreements, and generates a candidate narrative.
     * This is guidance for hiring teams only.
     */
    @PostMapping("/synthesize-feedback")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<FeedbackSynthesisResponse> synthesizeInterviewFeedback(
            @Valid @RequestBody FeedbackSynthesisRequest request) {

        // Validate scope access to both candidate and job opening
        recruitmentManagementService.getCandidateById(request.getCandidateId());
        recruitmentManagementService.getJobOpeningById(request.getJobOpeningId());

        FeedbackSynthesisResponse response = aiRecruitmentService.synthesizeInterviewFeedback(
                request.getCandidateId(),
                request.getJobOpeningId()
        );

        return ResponseEntity.ok(response);
    }
}
