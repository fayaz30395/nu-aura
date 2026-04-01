package com.hrms.api.probation.controller;

import com.hrms.api.probation.dto.*;
import com.hrms.application.probation.service.ProbationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.probation.ProbationPeriod.ProbationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/probation")
@RequiredArgsConstructor
@Slf4j
@Validated
public class ProbationController {

    private final ProbationService probationService;

    // ==================== Probation Period CRUD ====================

    @PostMapping
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationPeriodResponse> createProbation(
            @Valid @RequestBody ProbationPeriodRequest request) {
        log.info("Creating probation period for employee: {}", request.getEmployeeId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(probationService.createProbationPeriod(request));
    }

    @GetMapping("/{probationId}")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<ProbationPeriodResponse> getProbationById(@PathVariable UUID probationId) {
        return ResponseEntity.ok(probationService.getProbationById(probationId));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<ProbationPeriodResponse> getActiveProbationByEmployee(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(probationService.getActiveProbationByEmployee(employeeId));
    }

    @GetMapping
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<Page<ProbationPeriodResponse>> getAllProbations(Pageable pageable) {
        return ResponseEntity.ok(probationService.getAllProbations(pageable));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<Page<ProbationPeriodResponse>> getProbationsByStatus(
            @PathVariable ProbationStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(probationService.getProbationsByStatus(status, pageable));
    }

    @GetMapping("/search")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<Page<ProbationPeriodResponse>> searchProbations(
            @RequestParam(required = false) ProbationStatus status,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(probationService.searchProbations(status, managerId, startDate, endDate, pageable));
    }

    @GetMapping("/my-team")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<Page<ProbationPeriodResponse>> getMyTeamProbations(Pageable pageable) {
        return ResponseEntity.ok(probationService.getMyTeamProbations(pageable));
    }

    // ==================== Probation Actions ====================

    @PostMapping("/{probationId}/extend")
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationPeriodResponse> extendProbation(
            @PathVariable UUID probationId,
            @Valid @RequestBody ProbationExtensionRequest request) {
        log.info("Extending probation: {} by {} days", probationId, request.getExtensionDays());
        return ResponseEntity.ok(probationService.extendProbation(probationId, request));
    }

    @PostMapping("/{probationId}/confirm")
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationPeriodResponse> confirmEmployee(
            @PathVariable UUID probationId,
            @Valid @RequestBody ProbationConfirmationRequest request) {
        log.info("Confirming employee after probation: {}", probationId);
        return ResponseEntity.ok(probationService.confirmEmployee(probationId, request));
    }

    @PostMapping("/{probationId}/fail")
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationPeriodResponse> failProbation(
            @PathVariable UUID probationId,
            @Valid @RequestBody ProbationTerminationRequest request) {
        log.info("Failing probation: {}", probationId);
        return ResponseEntity.ok(probationService.failProbation(probationId, request));
    }

    @PostMapping("/{probationId}/terminate")
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationPeriodResponse> terminateProbation(
            @PathVariable UUID probationId,
            @Valid @RequestBody ProbationTerminationRequest request) {
        log.info("Terminating probation: {}", probationId);
        return ResponseEntity.ok(probationService.terminateProbation(probationId, request));
    }

    @PostMapping("/{probationId}/hold")
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationPeriodResponse> putOnHold(
            @PathVariable UUID probationId,
            @NotBlank @Size(max = 1000) @RequestParam String reason) {
        log.info("Putting probation on hold: {}", probationId);
        return ResponseEntity.ok(probationService.putOnHold(probationId, reason));
    }

    @PostMapping("/{probationId}/resume")
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationPeriodResponse> resumeProbation(
            @PathVariable UUID probationId,
            @RequestParam(required = false) Integer extensionDays) {
        log.info("Resuming probation from hold: {}", probationId);
        return ResponseEntity.ok(probationService.resumeProbation(probationId, extensionDays));
    }

    // ==================== Evaluations ====================

    @PostMapping("/evaluations")
    @RequiresPermission(Permission.PROBATION_MANAGE)
    public ResponseEntity<ProbationEvaluationResponse> addEvaluation(
            @Valid @RequestBody ProbationEvaluationRequest request) {
        log.info("Adding {} evaluation for probation: {}",
                request.getEvaluationType(), request.getProbationPeriodId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(probationService.addEvaluation(request));
    }

    @GetMapping("/{probationId}/evaluations")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<List<ProbationEvaluationResponse>> getEvaluationsForProbation(
            @PathVariable UUID probationId) {
        return ResponseEntity.ok(probationService.getEvaluationsForProbation(probationId));
    }

    @PostMapping("/evaluations/{evaluationId}/acknowledge")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<ProbationEvaluationResponse> acknowledgeEvaluation(
            @PathVariable UUID evaluationId,
            @Size(max = 1000) @RequestParam(required = false) String comments) {
        log.info("Acknowledging evaluation: {}", evaluationId);
        return ResponseEntity.ok(probationService.acknowledgeEvaluation(evaluationId, comments));
    }

    // ==================== Dashboard & Alerts ====================

    @GetMapping("/overdue")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<List<ProbationPeriodResponse>> getOverdueProbations() {
        return ResponseEntity.ok(probationService.getOverdueProbations());
    }

    @GetMapping("/ending-soon")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<List<ProbationPeriodResponse>> getProbationsEndingSoon(
            @RequestParam(defaultValue = "7") int daysAhead) {
        return ResponseEntity.ok(probationService.getProbationsEndingSoon(daysAhead));
    }

    @GetMapping("/evaluations-due")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<List<ProbationPeriodResponse>> getProbationsWithEvaluationsDue() {
        return ResponseEntity.ok(probationService.getProbationsWithEvaluationsDue());
    }

    @GetMapping("/statistics")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<ProbationStatisticsResponse> getStatistics() {
        return ResponseEntity.ok(probationService.getStatistics());
    }

    // ==================== Reference Data ====================

    @GetMapping("/statuses")
    @RequiresPermission(Permission.PROBATION_VIEW)
    public ResponseEntity<ProbationStatus[]> getStatuses() {
        return ResponseEntity.ok(ProbationStatus.values());
    }
}
