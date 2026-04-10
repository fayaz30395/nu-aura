package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.*;
import com.hrms.application.recruitment.service.AgencyService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for managing Recruitment Agencies and candidate submissions.
 * Part of the NU-Hire sub-application.
 */
@RestController
@RequestMapping("/api/v1/recruitment/agencies")
@RequiredArgsConstructor
public class AgencyController {

    private final AgencyService agencyService;

    // ==================== Agency CRUD ====================

    @PostMapping
    @RequiresPermission(Permission.AGENCY_CREATE)
    public ResponseEntity<AgencyDto> createAgency(@Valid @RequestBody CreateAgencyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agencyService.createAgency(request));
    }

    @GetMapping
    @RequiresPermission(Permission.AGENCY_VIEW)
    public ResponseEntity<Page<AgencyDto>> listAgencies(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(agencyService.listAgencies(status, search, pageable));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.AGENCY_VIEW)
    public ResponseEntity<AgencyDto> getAgency(@PathVariable UUID id) {
        return ResponseEntity.ok(agencyService.getAgencyById(id));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.AGENCY_UPDATE)
    public ResponseEntity<AgencyDto> updateAgency(@PathVariable UUID id,
                                                  @Valid @RequestBody UpdateAgencyRequest request) {
        return ResponseEntity.ok(agencyService.updateAgency(id, request));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.AGENCY_DELETE)
    public ResponseEntity<Void> deleteAgency(@PathVariable UUID id) {
        agencyService.deleteAgency(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Submissions ====================

    @GetMapping("/{id}/submissions")
    @RequiresPermission(Permission.AGENCY_VIEW)
    public ResponseEntity<Page<AgencySubmissionDto>> getAgencySubmissions(@PathVariable UUID id,
                                                                          Pageable pageable) {
        return ResponseEntity.ok(agencyService.getAgencySubmissions(id, pageable));
    }

    @PostMapping("/{id}/submissions")
    @RequiresPermission(Permission.AGENCY_MANAGE)
    public ResponseEntity<AgencySubmissionDto> submitCandidate(@PathVariable UUID id,
                                                               @Valid @RequestBody CreateSubmissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agencyService.submitCandidate(id, request));
    }

    @PutMapping("/submissions/{submissionId}/status")
    @RequiresPermission(Permission.AGENCY_MANAGE)
    public ResponseEntity<AgencySubmissionDto> updateSubmissionStatus(
            @PathVariable UUID submissionId,
            @Valid @RequestBody UpdateSubmissionStatusRequest request) {
        return ResponseEntity.ok(agencyService.updateSubmissionStatus(submissionId, request));
    }

    // ==================== Performance ====================

    @GetMapping("/{id}/performance")
    @RequiresPermission(Permission.AGENCY_VIEW)
    public ResponseEntity<AgencyPerformanceDto> getAgencyPerformance(@PathVariable UUID id) {
        return ResponseEntity.ok(agencyService.getAgencyPerformance(id));
    }

    // ==================== Cross-entity Queries ====================

    @GetMapping("/submissions/job/{jobOpeningId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW)
    public ResponseEntity<Page<AgencySubmissionDto>> getSubmissionsByJobOpening(
            @PathVariable UUID jobOpeningId,
            Pageable pageable) {
        return ResponseEntity.ok(agencyService.getSubmissionsByJobOpening(jobOpeningId, pageable));
    }
}
