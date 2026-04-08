package com.hrms.api.recruitment.controller;

import com.hrms.api.recruitment.dto.*;
import com.hrms.application.recruitment.service.ScorecardService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for managing Scorecard Templates and submitting interview scorecards.
 * Part of the NU-Hire sub-application.
 */
@RestController
@RequestMapping("/api/v1/recruitment/scorecards")
@RequiredArgsConstructor
public class ScorecardController {

    private final ScorecardService scorecardService;

    // ==================== Template CRUD ====================

    @GetMapping
    @RequiresPermission(Permission.SCORECARD_VIEW)
    public ResponseEntity<List<ScorecardTemplateResponse>> listTemplates() {
        return ResponseEntity.ok(scorecardService.getAllTemplates());
    }

    @PostMapping
    @RequiresPermission(Permission.SCORECARD_TEMPLATE_MANAGE)
    public ResponseEntity<ScorecardTemplateResponse> createTemplate(
            @Valid @RequestBody ScorecardTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scorecardService.createTemplate(request));
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.SCORECARD_VIEW)
    public ResponseEntity<ScorecardTemplateResponse> getTemplate(@PathVariable UUID id) {
        return ResponseEntity.ok(scorecardService.getTemplateById(id));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.SCORECARD_TEMPLATE_MANAGE)
    public ResponseEntity<ScorecardTemplateResponse> updateTemplate(
            @PathVariable UUID id,
            @Valid @RequestBody ScorecardTemplateRequest request) {
        return ResponseEntity.ok(scorecardService.updateTemplate(id, request));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.SCORECARD_DELETE)
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        scorecardService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Scorecard Submission ====================

    @PostMapping("/{id}/submit")
    @RequiresPermission(Permission.SCORECARD_CREATE)
    public ResponseEntity<ScorecardSubmissionResponse> submitScorecard(
            @PathVariable UUID id,
            @Valid @RequestBody ScorecardSubmissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scorecardService.submitScorecard(id, request));
    }
}
