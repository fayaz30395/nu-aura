package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.ApplicantPipelineResponse;
import com.hrms.api.recruitment.dto.ApplicantRequest;
import com.hrms.api.recruitment.dto.ApplicantResponse;
import com.hrms.api.recruitment.dto.ApplicantStatusUpdateRequest;
import com.hrms.application.recruitment.service.ApplicantService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.recruitment.ApplicationStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recruitment/applicants")
@RequiredArgsConstructor
public class ApplicantController {

    private final ApplicantService applicantService;

    @PostMapping
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    public ResponseEntity<ApplicantResponse> createApplicant(@Valid @RequestBody ApplicantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicantService.createApplicant(request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW_ALL)
    public ResponseEntity<ApplicantResponse> getApplicant(@PathVariable UUID id) {
        return ResponseEntity.ok(applicantService.getApplicant(id));
    }

    @GetMapping
    @RequiresPermission(Permission.RECRUITMENT_VIEW_ALL)
    public ResponseEntity<Page<ApplicantResponse>> listApplicants(
            @RequestParam(required = false) UUID jobOpeningId,
            @RequestParam(required = false) ApplicationStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(applicantService.listApplicants(jobOpeningId, status, pageable));
    }

    @PutMapping("/{id}/status")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<ApplicantResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicantStatusUpdateRequest request) {
        return ResponseEntity.ok(applicantService.updateStatus(id, request));
    }

    @GetMapping("/pipeline/{jobOpeningId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW_ALL)
    public ResponseEntity<ApplicantPipelineResponse> getPipeline(@PathVariable UUID jobOpeningId) {
        return ResponseEntity.ok(applicantService.getPipeline(jobOpeningId));
    }

    @PutMapping("/{id}/rating")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<ApplicantResponse> rateApplicant(
            @PathVariable UUID id,
            @RequestParam Integer rating) {
        return ResponseEntity.ok(applicantService.rateApplicant(id, rating));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    public ResponseEntity<Void> deleteApplicant(@PathVariable UUID id) {
        applicantService.deleteApplicant(id);
        return ResponseEntity.noContent().build();
    }
}
