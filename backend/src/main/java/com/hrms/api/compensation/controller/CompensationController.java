package com.hrms.api.compensation.controller;

import com.hrms.api.compensation.dto.*;
import com.hrms.application.compensation.service.CompensationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.RequiresFeature;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleStatus;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.domain.compensation.SalaryRevision.RevisionType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/compensation")
@RequiredArgsConstructor
@Slf4j
@RequiresFeature(FeatureFlag.ENABLE_PAYROLL)
public class CompensationController {

    private final CompensationService compensationService;

    // ==================== Review Cycle Endpoints ====================

    @PostMapping("/cycles")
    @RequiresPermission(Permission.COMPENSATION_MANAGE)
    public ResponseEntity<CompensationCycleResponse> createCycle(
            @Valid @RequestBody CompensationCycleRequest request) {
        log.info("Creating compensation review cycle: {}", request.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(compensationService.createCycle(request));
    }

    @GetMapping("/cycles/{cycleId}")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<CompensationCycleResponse> getCycleById(@PathVariable UUID cycleId) {
        return ResponseEntity.ok(compensationService.getCycleById(cycleId));
    }

    @GetMapping("/cycles")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<Page<CompensationCycleResponse>> getAllCycles(Pageable pageable) {
        return ResponseEntity.ok(compensationService.getAllCycles(pageable));
    }

    @GetMapping("/cycles/active")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<List<CompensationCycleResponse>> getActiveCycles() {
        return ResponseEntity.ok(compensationService.getActiveCycles());
    }

    @PostMapping("/cycles/{cycleId}/status")
    @RequiresPermission(Permission.COMPENSATION_MANAGE)
    public ResponseEntity<CompensationCycleResponse> updateCycleStatus(
            @PathVariable UUID cycleId,
            @RequestParam CycleStatus status) {
        log.info("Updating cycle {} status to {}", cycleId, status);
        return ResponseEntity.ok(compensationService.updateCycleStatus(cycleId, status));
    }

    @GetMapping("/cycles/{cycleId}/statistics")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<CompensationStatisticsResponse> getCycleStatistics(@PathVariable UUID cycleId) {
        return ResponseEntity.ok(compensationService.getCycleStatistics(cycleId));
    }

    // ==================== Salary Revision Endpoints ====================

    @PostMapping("/revisions")
    @RequiresPermission(Permission.COMPENSATION_MANAGE)
    public ResponseEntity<SalaryRevisionResponse> createRevision(
            @Valid @RequestBody SalaryRevisionRequest request) {
        log.info("Creating salary revision for employee: {}", request.getEmployeeId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(compensationService.createRevision(request));
    }

    @GetMapping("/revisions/{revisionId}")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<SalaryRevisionResponse> getRevisionById(@PathVariable UUID revisionId) {
        return ResponseEntity.ok(compensationService.getRevisionById(revisionId));
    }

    @GetMapping("/revisions")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<Page<SalaryRevisionResponse>> getAllRevisions(Pageable pageable) {
        return ResponseEntity.ok(compensationService.getAllRevisions(pageable));
    }

    @GetMapping("/cycles/{cycleId}/revisions")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<Page<SalaryRevisionResponse>> getRevisionsByCycle(
            @PathVariable UUID cycleId,
            Pageable pageable) {
        return ResponseEntity.ok(compensationService.getRevisionsByCycle(cycleId, pageable));
    }

    @GetMapping("/employees/{employeeId}/revisions")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<List<SalaryRevisionResponse>> getEmployeeRevisionHistory(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(compensationService.getEmployeeRevisionHistory(employeeId));
    }

    @GetMapping("/revisions/pending")
    @RequiresPermission(Permission.COMPENSATION_APPROVE)
    public ResponseEntity<Page<SalaryRevisionResponse>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(compensationService.getPendingApprovals(pageable));
    }

    // ==================== Revision Workflow Endpoints ====================

    @PostMapping("/revisions/{revisionId}/submit")
    @RequiresPermission(Permission.COMPENSATION_MANAGE)
    public ResponseEntity<SalaryRevisionResponse> submitRevision(@PathVariable UUID revisionId) {
        log.info("Submitting salary revision: {}", revisionId);
        return ResponseEntity.ok(compensationService.submitRevision(revisionId));
    }

    @PostMapping("/revisions/{revisionId}/review")
    @RequiresPermission(Permission.COMPENSATION_APPROVE)
    public ResponseEntity<SalaryRevisionResponse> reviewRevision(
            @PathVariable UUID revisionId,
            @RequestParam(required = false) String comments) {
        log.info("Reviewing salary revision: {}", revisionId);
        return ResponseEntity.ok(compensationService.reviewRevision(revisionId, comments));
    }

    @PostMapping("/revisions/{revisionId}/approve")
    @RequiresPermission(Permission.COMPENSATION_APPROVE)
    public ResponseEntity<SalaryRevisionResponse> approveRevision(
            @PathVariable UUID revisionId,
            @RequestParam(required = false) String comments) {
        log.info("Approving salary revision: {}", revisionId);
        return ResponseEntity.ok(compensationService.approveRevision(revisionId, comments));
    }

    @PostMapping("/revisions/{revisionId}/reject")
    @RequiresPermission(Permission.COMPENSATION_APPROVE)
    public ResponseEntity<SalaryRevisionResponse> rejectRevision(
            @PathVariable UUID revisionId,
            @RequestParam String reason) {
        log.info("Rejecting salary revision: {} - Reason: {}", revisionId, reason);
        return ResponseEntity.ok(compensationService.rejectRevision(revisionId, reason));
    }

    @PostMapping("/revisions/{revisionId}/apply")
    @RequiresPermission(Permission.COMPENSATION_MANAGE)
    public ResponseEntity<SalaryRevisionResponse> applyRevision(@PathVariable UUID revisionId) {
        log.info("Applying salary revision: {}", revisionId);
        return ResponseEntity.ok(compensationService.applyRevision(revisionId));
    }

    // ==================== Reference Data Endpoints ====================

    @GetMapping("/revision-types")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<RevisionType[]> getRevisionTypes() {
        return ResponseEntity.ok(RevisionType.values());
    }

    @GetMapping("/cycle-statuses")
    @RequiresPermission(Permission.COMPENSATION_VIEW)
    public ResponseEntity<CycleStatus[]> getCycleStatuses() {
        return ResponseEntity.ok(CycleStatus.values());
    }
}
