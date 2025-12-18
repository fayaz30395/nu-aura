package com.hrms.api.letter.controller;

import com.hrms.api.letter.dto.*;
import com.hrms.application.letter.service.LetterService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
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
@RequestMapping("/api/v1/letters")
@RequiredArgsConstructor
@Slf4j
public class LetterController {

    private final LetterService letterService;

    // ==================== Template Endpoints ====================

    @PostMapping("/templates")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    public ResponseEntity<LetterTemplateResponse> createTemplate(
            @Valid @RequestBody LetterTemplateRequest request) {
        log.info("Creating letter template: {}", request.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(letterService.createTemplate(request));
    }

    @PutMapping("/templates/{templateId}")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    public ResponseEntity<LetterTemplateResponse> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody LetterTemplateRequest request) {
        log.info("Updating letter template: {}", templateId);
        return ResponseEntity.ok(letterService.updateTemplate(templateId, request));
    }

    @GetMapping("/templates/{templateId}")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<LetterTemplateResponse> getTemplateById(@PathVariable UUID templateId) {
        return ResponseEntity.ok(letterService.getTemplateById(templateId));
    }

    @GetMapping("/templates")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<Page<LetterTemplateResponse>> getAllTemplates(Pageable pageable) {
        return ResponseEntity.ok(letterService.getAllTemplates(pageable));
    }

    @GetMapping("/templates/active")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<List<LetterTemplateResponse>> getActiveTemplates() {
        return ResponseEntity.ok(letterService.getActiveTemplates());
    }

    @GetMapping("/templates/by-category")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<List<LetterTemplateResponse>> getTemplatesByCategory(
            @RequestParam LetterCategory category) {
        return ResponseEntity.ok(letterService.getTemplatesByCategory(category));
    }

    @DeleteMapping("/templates/{templateId}")
    @RequiresPermission(Permission.DOCUMENT_DELETE)
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID templateId) {
        log.info("Deleting letter template: {}", templateId);
        letterService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Letter Generation Endpoints ====================

    @PostMapping("/generate")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    public ResponseEntity<GeneratedLetterResponse> generateLetter(
            @Valid @RequestBody GenerateLetterRequest request,
            @RequestParam UUID generatedBy) {
        log.info("Generating letter for employee: {}", request.getEmployeeId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(letterService.generateLetter(request, generatedBy));
    }

    @GetMapping("/{letterId}")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<GeneratedLetterResponse> getLetterById(@PathVariable UUID letterId) {
        return ResponseEntity.ok(letterService.getLetterById(letterId));
    }

    @GetMapping
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<Page<GeneratedLetterResponse>> getAllLetters(Pageable pageable) {
        return ResponseEntity.ok(letterService.getAllLetters(pageable));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<Page<GeneratedLetterResponse>> getLettersByEmployee(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(letterService.getLettersByEmployee(employeeId, pageable));
    }

    @GetMapping("/employee/{employeeId}/issued")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<GeneratedLetterResponse>> getIssuedLettersForEmployee(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(letterService.getIssuedLettersForEmployee(employeeId));
    }

    @GetMapping("/pending-approvals")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<Page<GeneratedLetterResponse>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(letterService.getPendingApprovals(pageable));
    }

    // ==================== Letter Workflow Endpoints ====================

    @PostMapping("/{letterId}/submit")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    public ResponseEntity<GeneratedLetterResponse> submitForApproval(@PathVariable UUID letterId) {
        log.info("Submitting letter for approval: {}", letterId);
        return ResponseEntity.ok(letterService.submitForApproval(letterId));
    }

    @PostMapping("/{letterId}/approve")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<GeneratedLetterResponse> approveLetter(
            @PathVariable UUID letterId,
            @RequestParam UUID approverId,
            @RequestParam(required = false) String comments) {
        log.info("Approving letter: {}", letterId);
        return ResponseEntity.ok(letterService.approveLetter(letterId, approverId, comments));
    }

    @PostMapping("/{letterId}/issue")
    @RequiresPermission(Permission.DOCUMENT_APPROVE)
    public ResponseEntity<GeneratedLetterResponse> issueLetter(
            @PathVariable UUID letterId,
            @RequestParam UUID issuerId) {
        log.info("Issuing letter: {}", letterId);
        return ResponseEntity.ok(letterService.issueLetter(letterId, issuerId));
    }

    @PostMapping("/{letterId}/revoke")
    @RequiresPermission(Permission.DOCUMENT_DELETE)
    public ResponseEntity<GeneratedLetterResponse> revokeLetter(@PathVariable UUID letterId) {
        log.info("Revoking letter: {}", letterId);
        return ResponseEntity.ok(letterService.revokeLetter(letterId));
    }

    @PostMapping("/{letterId}/downloaded")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> markLetterDownloaded(
            @PathVariable UUID letterId,
            @RequestParam UUID employeeId) {
        letterService.markLetterDownloaded(letterId, employeeId);
        return ResponseEntity.ok().build();
    }

    // ==================== Reference Data Endpoints ====================

    @GetMapping("/categories")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    public ResponseEntity<LetterCategory[]> getLetterCategories() {
        return ResponseEntity.ok(letterService.getLetterCategories());
    }
}
