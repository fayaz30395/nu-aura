package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.ApplicantPipelineResponse;
import com.hrms.api.recruitment.dto.ApplicantRequest;
import com.hrms.api.recruitment.dto.ApplicantResponse;
import com.hrms.api.recruitment.dto.ApplicantStatusUpdateRequest;
import com.hrms.application.recruitment.service.ApplicantService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.recruitment.ApplicationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Applicants", description = "Recruitment applicant management APIs")
public class ApplicantController {

    private final ApplicantService applicantService;

    @PostMapping
    @RequiresPermission(Permission.RECRUITMENT_CREATE)
    @Operation(summary = "Create applicant", description = "Creates a new applicant record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Applicant created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:CREATE permission")
    })
    public ResponseEntity<ApplicantResponse> createApplicant(@Valid @RequestBody ApplicantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicantService.createApplicant(request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW_ALL)
    @Operation(summary = "Get applicant", description = "Returns a single applicant by their UUID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Applicant found"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:VIEW_ALL permission"),
            @ApiResponse(responseCode = "404", description = "Applicant not found")
    })
    public ResponseEntity<ApplicantResponse> getApplicant(
            @Parameter(description = "Applicant UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(applicantService.getApplicant(id));
    }

    @GetMapping
    @RequiresPermission(Permission.RECRUITMENT_VIEW_ALL)
    @Operation(summary = "List applicants", description = "Returns a paginated list of applicants with optional job opening and status filters")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Applicants retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:VIEW_ALL permission")
    })
    public ResponseEntity<Page<ApplicantResponse>> listApplicants(
            @Parameter(description = "Filter by job opening UUID") @RequestParam(required = false) UUID jobOpeningId,
            @Parameter(description = "Filter by application status") @RequestParam(required = false) ApplicationStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(applicantService.listApplicants(jobOpeningId, status, pageable));
    }

    @PutMapping("/{id}/status")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Update applicant status", description = "Transitions an applicant through pipeline stages")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Status updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid status transition"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Applicant not found")
    })
    public ResponseEntity<ApplicantResponse> updateStatus(
            @Parameter(description = "Applicant UUID") @PathVariable UUID id,
            @Valid @RequestBody ApplicantStatusUpdateRequest request) {
        return ResponseEntity.ok(applicantService.updateStatus(id, request));
    }

    @GetMapping("/pipeline/{jobOpeningId}")
    @RequiresPermission(Permission.RECRUITMENT_VIEW_ALL)
    @Operation(summary = "Get pipeline view", description = "Returns the applicant pipeline grouped by stage for the specified job opening")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Pipeline retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:VIEW_ALL permission"),
            @ApiResponse(responseCode = "404", description = "Job opening not found")
    })
    public ResponseEntity<ApplicantPipelineResponse> getPipeline(
            @Parameter(description = "Job opening UUID") @PathVariable UUID jobOpeningId) {
        return ResponseEntity.ok(applicantService.getPipeline(jobOpeningId));
    }

    @PutMapping("/{id}/rating")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Rate applicant", description = "Records a numerical rating on an applicant")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rating recorded successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid rating value"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Applicant not found")
    })
    public ResponseEntity<ApplicantResponse> rateApplicant(
            @Parameter(description = "Applicant UUID") @PathVariable UUID id,
            @Parameter(description = "Rating value") @RequestParam Integer rating) {
        return ResponseEntity.ok(applicantService.rateApplicant(id, rating));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.RECRUITMENT_MANAGE)
    @Operation(summary = "Delete applicant", description = "Soft-deletes an applicant record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Applicant deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — requires RECRUITMENT:MANAGE permission"),
            @ApiResponse(responseCode = "404", description = "Applicant not found")
    })
    public ResponseEntity<Void> deleteApplicant(
            @Parameter(description = "Applicant UUID") @PathVariable UUID id) {
        applicantService.deleteApplicant(id);
        return ResponseEntity.noContent().build();
    }
}
