package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.*;
import com.hrms.application.recruitment.service.RecruitmentManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.recruitment.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recruitment")
@RequiredArgsConstructor
public class RecruitmentManagementController {

    private final RecruitmentManagementService recruitmentService;

    // ==================== Job Opening Endpoints ====================

    @PostMapping("/job-openings")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<JobOpeningResponse> createJobOpening(@RequestBody JobOpeningRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recruitmentService.createJobOpening(request));
    }

    @PutMapping("/job-openings/{id}")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<JobOpeningResponse> updateJobOpening(
            @PathVariable UUID id,
            @RequestBody JobOpeningRequest request) {
        return ResponseEntity.ok(recruitmentService.updateJobOpening(id, request));
    }

    @GetMapping("/job-openings/{id}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<JobOpeningResponse> getJobOpeningById(@PathVariable UUID id) {
        return ResponseEntity.ok(recruitmentService.getJobOpeningById(id));
    }

    @GetMapping("/job-openings")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<JobOpeningResponse>> getAllJobOpenings(Pageable pageable) {
        return ResponseEntity.ok(recruitmentService.getAllJobOpenings(pageable));
    }

    @GetMapping("/job-openings/status/{status}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<JobOpeningResponse>> getJobOpeningsByStatus(
            @PathVariable JobOpening.JobStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(recruitmentService.getJobOpeningsByStatus(status, pageable));
    }

    @DeleteMapping("/job-openings/{id}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<Void> deleteJobOpening(@PathVariable UUID id) {
        recruitmentService.deleteJobOpening(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Candidate Endpoints ====================

    @PostMapping("/candidates")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<CandidateResponse> createCandidate(@RequestBody CandidateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recruitmentService.createCandidate(request));
    }

    @PutMapping("/candidates/{id}")
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<CandidateResponse> updateCandidate(
            @PathVariable UUID id,
            @RequestBody CandidateRequest request) {
        return ResponseEntity.ok(recruitmentService.updateCandidate(id, request));
    }

    @GetMapping("/candidates/{id}")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<CandidateResponse> getCandidateById(@PathVariable UUID id) {
        return ResponseEntity.ok(recruitmentService.getCandidateById(id));
    }

    @GetMapping("/candidates")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<Page<CandidateResponse>> getAllCandidates(Pageable pageable) {
        return ResponseEntity.ok(recruitmentService.getAllCandidates(pageable));
    }

    @GetMapping("/candidates/job-opening/{jobOpeningId}")
    @RequiresPermission(Permission.CANDIDATE_VIEW)
    public ResponseEntity<Page<CandidateResponse>> getCandidatesByJobOpening(
            @PathVariable UUID jobOpeningId,
            Pageable pageable) {
        return ResponseEntity.ok(recruitmentService.getCandidatesByJobOpening(jobOpeningId, pageable));
    }

    @DeleteMapping("/candidates/{id}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<Void> deleteCandidate(@PathVariable UUID id) {
        recruitmentService.deleteCandidate(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Offer Response Endpoints ====================

    @PostMapping("/candidates/{id}/accept-offer")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<CandidateResponse> acceptOffer(
            @PathVariable UUID id,
            @Valid @RequestBody OfferResponseRequest request) {
        // Validate that path candidateId matches body candidateId
        if (request.getCandidateId() != null && !request.getCandidateId().equals(id)) {
            throw new IllegalArgumentException("Candidate ID in path does not match candidate ID in request body");
        }
        return ResponseEntity.ok(recruitmentService.acceptOffer(id, request.getConfirmedJoiningDate()));
    }

    @PostMapping("/candidates/{id}/decline-offer")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<CandidateResponse> declineOffer(
            @PathVariable UUID id,
            @Valid @RequestBody OfferResponseRequest request) {
        // Validate that path candidateId matches body candidateId
        if (request.getCandidateId() != null && !request.getCandidateId().equals(id)) {
            throw new IllegalArgumentException("Candidate ID in path does not match candidate ID in request body");
        }
        return ResponseEntity.ok(recruitmentService.declineOffer(id, request.getDeclineReason()));
    }

    // ==================== Interview Endpoints ====================

    @PostMapping("/interviews")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<InterviewResponse> scheduleInterview(@RequestBody InterviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recruitmentService.scheduleInterview(request));
    }

    @PutMapping("/interviews/{id}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<InterviewResponse> updateInterview(
            @PathVariable UUID id,
            @RequestBody InterviewRequest request) {
        return ResponseEntity.ok(recruitmentService.updateInterview(id, request));
    }

    @GetMapping("/interviews/{id}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<InterviewResponse> getInterviewById(@PathVariable UUID id) {
        return ResponseEntity.ok(recruitmentService.getInterviewById(id));
    }

    @GetMapping("/interviews/candidate/{candidateId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<InterviewResponse>> getInterviewsByCandidate(
            @PathVariable UUID candidateId,
            Pageable pageable) {
        return ResponseEntity.ok(recruitmentService.getInterviewsByCandidate(candidateId, pageable));
    }

    @DeleteMapping("/interviews/{id}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<Void> deleteInterview(@PathVariable UUID id) {
        recruitmentService.deleteInterview(id);
        return ResponseEntity.noContent().build();
    }
}
