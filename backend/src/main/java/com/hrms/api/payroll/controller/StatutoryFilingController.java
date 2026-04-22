package com.hrms.api.payroll.controller;

import com.hrms.api.payroll.dto.StatutoryFilingDto.*;
import com.hrms.application.payroll.service.StatutoryFilingService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.payroll.StatutoryFilingRun;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

/**
 * REST API for statutory filing format generation.
 *
 * <p>Enables HR/Finance teams to generate, validate, download, and track
 * statutory returns (PF ECR, ESI Return, PT Challan, Form 16, Form 24Q, LWF Return)
 * required for Indian government portal submissions.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payroll/statutory-filings")
@RequiredArgsConstructor
public class StatutoryFilingController {

    private final StatutoryFilingService statutoryFilingService;

    /**
     * List available filing types with metadata (format, frequency, portal info).
     */
    @GetMapping("/types")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<FilingTypeInfo>> getFilingTypes() {
        return ResponseEntity.ok(statutoryFilingService.getAvailableFilingTypes());
    }

    /**
     * Generate a statutory filing for a given type and period.
     * Creates the file, stores in MinIO, and returns the filing run details.
     */
    @PostMapping("/generate")
    @RequiresPermission(value = Permission.STATUTORY_MANAGE, revalidate = true)
    public ResponseEntity<FilingRunResponse> generateFiling(
            @Valid @RequestBody GenerateRequest request) {
        log.info("Generating statutory filing: type={}, period={}/{}",
                request.getFilingType(), request.getMonth(), request.getYear());
        FilingRunResponse response = statutoryFilingService.generateFiling(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * List filing runs with optional type filter and pagination.
     */
    @GetMapping
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<Page<FilingRunResponse>> getFilingHistory(
            @RequestParam(required = false) FilingType filingType,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(statutoryFilingService.getFilingHistory(filingType, pageable));
    }

    /**
     * Get details of a specific filing run including validation status.
     */
    @GetMapping("/{id}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<FilingRunResponse> getFilingRunDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(statutoryFilingService.getFilingRunDetail(id));
    }

    /**
     * Download the generated file for a filing run.
     */
    @GetMapping("/{id}/download")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<InputStreamResource> downloadFiling(@PathVariable UUID id) {
        StatutoryFilingRun run = statutoryFilingService.getFilingRun(id);
        InputStream fileStream = statutoryFilingService.downloadFiling(id);

        String contentType = run.getContentType() != null
                ? run.getContentType() : "application/octet-stream";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + run.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(new InputStreamResource(fileStream));
    }

    /**
     * Validate a filing run against statutory rules.
     * Returns validation errors and warnings.
     */
    @PostMapping("/{id}/validate")
    @RequiresPermission(Permission.STATUTORY_MANAGE)
    public ResponseEntity<ValidationResult> validateFiling(@PathVariable UUID id) {
        return ResponseEntity.ok(statutoryFilingService.validateFiling(id));
    }

    /**
     * Mark a filing run as submitted to the government portal.
     */
    @PutMapping("/{id}/submit")
    @RequiresPermission(value = Permission.STATUTORY_MANAGE, revalidate = true)
    public ResponseEntity<FilingRunResponse> submitFiling(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitRequest request) {
        log.info("Marking filing run {} as submitted", id);
        return ResponseEntity.ok(statutoryFilingService.markAsSubmitted(id, request));
    }
}
