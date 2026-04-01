package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.*;
import com.hrms.application.recruitment.service.RecruitmentManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.UUID;

/**
 * Main Recruitment REST Controller for managing job openings, candidates, and
 * interviews.
 */
@RestController
@RequestMapping("/api/v1/recruitment")
@RequiredArgsConstructor
public class RecruitmentController {

    private final RecruitmentManagementService recruitmentManagementService;

    // ==================== JOB OPENINGS ====================

    @PostMapping("/job-openings")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<JobOpeningResponse> createJobOpening(@Valid @RequestBody JobOpeningRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recruitmentManagementService.createJobOpening(request));
    }

    @PutMapping("/job-openings/{id}")
    @RequiresPermission(Permission.RECRUITMENT_UPDATE)
    public ResponseEntity<JobOpeningResponse> updateJobOpening(@PathVariable UUID id,
            @Valid @RequestBody JobOpeningRequest request) {
        return ResponseEntity.ok(recruitmentManagementService.updateJobOpening(id, request));
    }

    @GetMapping("/job-openings/{id}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<JobOpeningResponse> getJobOpening(@PathVariable UUID id) {
        return ResponseEntity.ok(recruitmentManagementService.getJobOpeningById(id));
    }

    @GetMapping("/job-openings")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<JobOpeningResponse>> getAllJobOpenings(Pageable pageable) {
        return ResponseEntity.ok(recruitmentManagementService.getAllJobOpenings(pageable));
    }

    @GetMapping("/job-openings/status/{status}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<JobOpeningResponse>> getJobOpeningsByStatus(@PathVariable JobOpening.JobStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(recruitmentManagementService.getJobOpeningsByStatus(status, pageable));
    }

    @DeleteMapping("/job-openings/{id}")
    @RequiresPermission(Permission.RECRUITMENT_DELETE)
    public ResponseEntity<Void> deleteJobOpening(@PathVariable UUID id) {
        recruitmentManagementService.deleteJobOpening(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== CANDIDATES ====================

    @PostMapping("/candidates")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<CandidateResponse> createCandidate(@Valid @RequestBody CandidateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recruitmentManagementService.createCandidate(request));
    }

    @PutMapping("/candidates/{id}")
    @RequiresPermission(Permission.RECRUITMENT_UPDATE)
    public ResponseEntity<CandidateResponse> updateCandidate(@PathVariable UUID id,
            @Valid @RequestBody CandidateRequest request) {
        return ResponseEntity.ok(recruitmentManagementService.updateCandidate(id, request));
    }

    @GetMapping("/candidates/{id}")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<CandidateResponse> getCandidate(@PathVariable UUID id) {
        return ResponseEntity.ok(recruitmentManagementService.getCandidateById(id));
    }

    @GetMapping("/candidates")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<Page<CandidateResponse>> getAllCandidates(Pageable pageable) {
        return ResponseEntity.ok(recruitmentManagementService.getAllCandidates(pageable));
    }

    @GetMapping("/candidates/job-opening/{jobOpeningId}")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<Page<CandidateResponse>> getCandidatesByJobOpening(@PathVariable UUID jobOpeningId,
            Pageable pageable) {
        return ResponseEntity.ok(recruitmentManagementService.getCandidatesByJobOpening(jobOpeningId, pageable));
    }

    @PutMapping("/candidates/{id}/stage")
    @RequiresPermission(Permission.RECRUITMENT_UPDATE)
    public ResponseEntity<CandidateResponse> moveCandidateStage(@PathVariable UUID id,
            @Valid @RequestBody MoveStageRequest request) {
        return ResponseEntity
                .ok(recruitmentManagementService.moveCandidateStage(id, request.getStage(), request.getNotes()));
    }

    @PostMapping("/candidates/{id}/offer")
    @RequiresPermission(Permission.RECRUITMENT_UPDATE)
    public ResponseEntity<CandidateResponse> createOffer(@PathVariable UUID id,
            @Valid @RequestBody CreateOfferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recruitmentManagementService.createOffer(id, request));
    }

    @PostMapping("/candidates/{id}/accept-offer")
    @RequiresPermission(Permission.RECRUITMENT_UPDATE)
    public ResponseEntity<CandidateResponse> acceptOffer(@PathVariable UUID id,
            @Valid @RequestBody(required = false) OfferResponseRequest request) {
        return ResponseEntity.ok(recruitmentManagementService.acceptOffer(id,
                request != null ? request.getConfirmedJoiningDate() : null));
    }

    @PostMapping("/candidates/{id}/decline-offer")
    @RequiresPermission(Permission.RECRUITMENT_UPDATE)
    public ResponseEntity<CandidateResponse> declineOffer(@PathVariable UUID id,
            @Valid @RequestBody(required = false) OfferResponseRequest request) {
        return ResponseEntity.ok(recruitmentManagementService.declineOffer(id,
                request != null ? request.getDeclineReason() : "No reason provided"));
    }

    @DeleteMapping("/candidates/{id}")
    @RequiresPermission(Permission.RECRUITMENT_DELETE)
    public ResponseEntity<Void> deleteCandidate(@PathVariable UUID id) {
        recruitmentManagementService.deleteCandidate(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== INTERVIEWS ====================

    @GetMapping("/interviews")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<InterviewResponse>> getAllInterviews(Pageable pageable) {
        return ResponseEntity.ok(recruitmentManagementService.getAllInterviews(pageable));
    }

    @PostMapping("/interviews")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<InterviewResponse> scheduleInterview(@Valid @RequestBody InterviewRequest request) {
        return ResponseEntity.ok(recruitmentManagementService.scheduleInterview(request));
    }

    @PutMapping("/interviews/{id}")
    @RequiresPermission(Permission.RECRUITMENT_UPDATE)
    public ResponseEntity<InterviewResponse> updateInterview(@PathVariable UUID id,
            @Valid @RequestBody InterviewRequest request) {
        return ResponseEntity.ok(recruitmentManagementService.updateInterview(id, request));
    }

    @GetMapping("/interviews/{id}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<InterviewResponse> getInterview(@PathVariable UUID id) {
        return ResponseEntity.ok(recruitmentManagementService.getInterviewById(id));
    }

    @GetMapping("/interviews/candidate/{candidateId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<InterviewResponse>> getInterviewsByCandidate(@PathVariable UUID candidateId,
            Pageable pageable) {
        return ResponseEntity.ok(recruitmentManagementService.getInterviewsByCandidate(candidateId, pageable));
    }

    @DeleteMapping("/interviews/{id}")
    @RequiresPermission(Permission.RECRUITMENT_DELETE)
    public ResponseEntity<Void> deleteInterview(@PathVariable UUID id) {
        recruitmentManagementService.deleteInterview(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== OFFERS ====================

    @GetMapping("/offers")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<CandidateResponse>> getAllOffers(Pageable pageable) {
        return ResponseEntity.ok(recruitmentManagementService.getAllOffers(pageable));
    }
}
