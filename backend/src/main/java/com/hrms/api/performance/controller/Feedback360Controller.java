package com.hrms.api.performance.controller;

import com.hrms.api.performance.dto.*;
import com.hrms.application.performance.service.Feedback360Service;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.performance.*;
import com.hrms.domain.performance.Feedback360Request.ReviewerType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/feedback360")
@RequiredArgsConstructor
public class Feedback360Controller {

    private final Feedback360Service feedback360Service;

    // ========== Cycles ==========

    @PostMapping("/cycles")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Feedback360CycleResponse> createCycle(@Valid @RequestBody Feedback360CycleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Feedback360Cycle cycle = Feedback360Cycle.builder()
                .name(request.getName())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .nominationDeadline(request.getNominationDeadline())
                .selfReviewDeadline(request.getSelfReviewDeadline())
                .peerReviewDeadline(request.getPeerReviewDeadline())
                .managerReviewDeadline(request.getManagerReviewDeadline())
                .minPeersRequired(request.getMinPeersRequired() != null ? request.getMinPeersRequired() : 3)
                .maxPeersAllowed(request.getMaxPeersAllowed() != null ? request.getMaxPeersAllowed() : 8)
                .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : true)
                .includeSelfReview(request.getIncludeSelfReview() != null ? request.getIncludeSelfReview() : true)
                .includeManagerReview(request.getIncludeManagerReview() != null ? request.getIncludeManagerReview() : true)
                .includePeerReview(request.getIncludePeerReview() != null ? request.getIncludePeerReview() : true)
                .includeUpwardReview(request.getIncludeUpwardReview() != null ? request.getIncludeUpwardReview() : false)
                .templateId(request.getTemplateId())
                .build();
        cycle.setTenantId(tenantId);

        Feedback360Cycle saved = feedback360Service.createCycle(cycle);
        return ResponseEntity.ok(Feedback360CycleResponse.fromEntity(saved));
    }

    @GetMapping("/cycles")
    @RequiresPermission(Permission.FEEDBACK_360_VIEW)
    public ResponseEntity<Page<Feedback360CycleResponse>> getCycles(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<Feedback360Cycle> cycles = feedback360Service.getAllCycles(tenantId, pageable);
        return ResponseEntity.ok(cycles.map(Feedback360CycleResponse::fromEntity));
    }

    @GetMapping("/cycles/active")
    @RequiresPermission(Permission.FEEDBACK_360_VIEW)
    public ResponseEntity<List<Feedback360CycleResponse>> getActiveCycles() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Feedback360Cycle> cycles = feedback360Service.getActiveCycles(tenantId);
        return ResponseEntity.ok(cycles.stream()
                .map(Feedback360CycleResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/cycles/{id}")
    @RequiresPermission(Permission.FEEDBACK_360_VIEW)
    public ResponseEntity<Feedback360CycleResponse> getCycle(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return feedback360Service.getCycleById(tenantId, id)
                .map(cycle -> ResponseEntity.ok(Feedback360CycleResponse.fromEntity(cycle)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/cycles/{id}")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Feedback360CycleResponse> updateCycle(
            @PathVariable UUID id,
            @Valid @RequestBody Feedback360CycleRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return feedback360Service.getCycleById(tenantId, id)
                .map(existing -> {
                    existing.setName(request.getName());
                    existing.setDescription(request.getDescription());
                    existing.setStartDate(request.getStartDate());
                    existing.setEndDate(request.getEndDate());
                    existing.setNominationDeadline(request.getNominationDeadline());
                    existing.setSelfReviewDeadline(request.getSelfReviewDeadline());
                    existing.setPeerReviewDeadline(request.getPeerReviewDeadline());
                    existing.setManagerReviewDeadline(request.getManagerReviewDeadline());
                    if (request.getMinPeersRequired() != null) {
                        existing.setMinPeersRequired(request.getMinPeersRequired());
                    }
                    if (request.getMaxPeersAllowed() != null) {
                        existing.setMaxPeersAllowed(request.getMaxPeersAllowed());
                    }
                    if (request.getIsAnonymous() != null) {
                        existing.setIsAnonymous(request.getIsAnonymous());
                    }
                    existing.setUpdatedAt(LocalDateTime.now());

                    Feedback360Cycle updated = feedback360Service.updateCycle(existing);
                    return ResponseEntity.ok(Feedback360CycleResponse.fromEntity(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/cycles/{id}/activate")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Void> activateCycle(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        feedback360Service.activateCycle(tenantId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cycles/{id}/close")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Void> closeCycle(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        feedback360Service.closeCycle(tenantId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/cycles/{id}")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Void> deleteCycle(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        feedback360Service.deleteCycle(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Requests ==========

    @PostMapping("/cycles/{cycleId}/requests")
    @RequiresPermission(Permission.FEEDBACK_360_CREATE)
    public ResponseEntity<Void> createRequest(
            @PathVariable UUID cycleId,
            @RequestParam UUID subjectEmployeeId,
            @RequestParam UUID reviewerId,
            @RequestParam ReviewerType reviewerType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID nominatedBy = SecurityContext.getCurrentEmployeeId();

        Feedback360Request feedbackReq = Feedback360Request.builder()
                .cycleId(cycleId)
                .subjectEmployeeId(subjectEmployeeId)
                .reviewerId(reviewerId)
                .reviewerType(reviewerType)
                .nominatedBy(nominatedBy)
                .build();
        feedbackReq.setTenantId(tenantId);

        feedback360Service.createRequest(feedbackReq);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/cycles/{cycleId}/requests")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Page<?>> getRequests(@PathVariable UUID cycleId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<Feedback360Request> requests = feedback360Service.getRequestsByCycle(tenantId, cycleId, pageable);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/my-pending-reviews")
    @RequiresPermission(Permission.FEEDBACK_360_VIEW)
    public ResponseEntity<List<Feedback360Request>> getMyPendingReviews() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        List<Feedback360Request> requests = feedback360Service.getPendingReviewsForReviewer(tenantId, employeeId);
        return ResponseEntity.ok(requests);
    }

    @PostMapping("/requests/{requestId}/approve")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Void> approveNomination(@PathVariable UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentEmployeeId();
        feedback360Service.approveNomination(tenantId, requestId, approverId);
        return ResponseEntity.ok().build();
    }

    // ========== Responses ==========

    @PostMapping("/responses")
    @RequiresPermission(Permission.FEEDBACK_360_SUBMIT)
    public ResponseEntity<Void> submitResponse(@Valid @RequestBody Feedback360ResponseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID reviewerId = SecurityContext.getCurrentEmployeeId();

        // Get the feedback request to get subject and cycle info
        Feedback360Request feedbackRequest = feedback360Service.getRequestById(tenantId, request.getRequestId())
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Feedback request not found: " + request.getRequestId()));

        Feedback360Response response = Feedback360Response.builder()
                .requestId(request.getRequestId())
                .cycleId(feedbackRequest.getCycleId())
                .subjectEmployeeId(feedbackRequest.getSubjectEmployeeId())
                .reviewerId(reviewerId)
                .reviewerType(feedbackRequest.getReviewerType())
                .isDraft(request.getIsDraft() != null ? request.getIsDraft() : true)
                .overallRating(request.getOverallRating())
                .communicationRating(request.getCommunicationRating())
                .teamworkRating(request.getTeamworkRating())
                .leadershipRating(request.getLeadershipRating())
                .problemSolvingRating(request.getProblemSolvingRating())
                .technicalSkillsRating(request.getTechnicalSkillsRating())
                .adaptabilityRating(request.getAdaptabilityRating())
                .workQualityRating(request.getWorkQualityRating())
                .timeManagementRating(request.getTimeManagementRating())
                .strengths(request.getStrengths())
                .areasForImprovement(request.getAreasForImprovement())
                .additionalComments(request.getAdditionalComments())
                .specificExamples(request.getSpecificExamples())
                .developmentSuggestions(request.getDevelopmentSuggestions())
                .customResponses(request.getCustomResponses())
                .build();
        response.setTenantId(tenantId);

        if (!response.getIsDraft()) {
            response.setSubmittedAt(LocalDateTime.now());
        }

        feedback360Service.createOrUpdateResponse(response);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/responses/{requestId}")
    @RequiresPermission(Permission.FEEDBACK_360_VIEW)
    public ResponseEntity<Feedback360Response> getResponse(@PathVariable UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        return feedback360Service.getResponseByRequest(tenantId, requestId)
                .map(response -> {
                    boolean isReviewer = response.getReviewerId() != null
                            && response.getReviewerId().equals(currentEmployeeId);
                    boolean isSubject = response.getSubjectEmployeeId() != null
                            && response.getSubjectEmployeeId().equals(currentEmployeeId);
                    if (!isReviewer && !isSubject) {
                        throw new org.springframework.security.access.AccessDeniedException(
                                "Not authorized to view this feedback response");
                    }
                    // NEW-11 FIX: Enforce anonymity — when the subject views a response
                    // and the cycle is anonymous, strip the reviewer identity.
                    if (isSubject && !isReviewer && response.getCycleId() != null) {
                        feedback360Service.getCycleById(tenantId, response.getCycleId())
                                .filter(cycle -> Boolean.TRUE.equals(cycle.getIsAnonymous()))
                                .ifPresent(cycle -> response.setReviewerId(null));
                    }
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ========== Summaries ==========

    @PostMapping("/cycles/{cycleId}/summaries/{subjectEmployeeId}/generate")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Feedback360SummaryResponse> generateSummary(
            @PathVariable UUID cycleId,
            @PathVariable UUID subjectEmployeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Feedback360Summary summary = feedback360Service.generateSummary(tenantId, cycleId, subjectEmployeeId);
        return ResponseEntity.ok(Feedback360SummaryResponse.fromEntity(summary));
    }

    @GetMapping("/cycles/{cycleId}/summaries")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<List<Feedback360SummaryResponse>> getCycleSummaries(@PathVariable UUID cycleId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Feedback360Summary> summaries = feedback360Service.getSummariesForCycle(tenantId, cycleId);
        return ResponseEntity.ok(summaries.stream()
                .map(Feedback360SummaryResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/my-summaries")
    @RequiresPermission(Permission.FEEDBACK_360_VIEW)
    public ResponseEntity<List<Feedback360SummaryResponse>> getMySummaries() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        List<Feedback360Summary> summaries = feedback360Service.getEmployeeSummaries(tenantId, employeeId);
        return ResponseEntity.ok(summaries.stream()
                .filter(s -> s.getSharedWithEmployee() != null && s.getSharedWithEmployee())
                .map(Feedback360SummaryResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @PostMapping("/summaries/{summaryId}/share")
    @RequiresPermission(Permission.FEEDBACK_360_MANAGE)
    public ResponseEntity<Void> shareSummaryWithEmployee(@PathVariable UUID summaryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        feedback360Service.shareWithEmployee(tenantId, summaryId);
        return ResponseEntity.ok().build();
    }

    // ========== Dashboard ==========

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.FEEDBACK_360_VIEW)
    public ResponseEntity<Map<String, Object>> getDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        Map<String, Object> stats = feedback360Service.getDashboardStats(tenantId, employeeId);
        return ResponseEntity.ok(stats);
    }
}
