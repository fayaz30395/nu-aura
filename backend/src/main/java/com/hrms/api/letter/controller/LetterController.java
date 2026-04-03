package com.hrms.api.letter.controller;

import com.hrms.api.letter.dto.*;
import com.hrms.application.letter.service.LetterPdfService;
import com.hrms.application.letter.service.LetterService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/letters")
@RequiredArgsConstructor
@Slf4j
@Validated
public class LetterController {

    private final LetterService letterService;
    private final LetterPdfService letterPdfService;

    // ==================== Template Endpoints ====================

    @PostMapping("/templates")
    @RequiresPermission(LETTER_TEMPLATE_CREATE)
    public ResponseEntity<LetterTemplateResponse> createTemplate(
            @Valid @RequestBody LetterTemplateRequest request) {
        log.info("Creating letter template: {}", request.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(letterService.createTemplate(request));
    }

    @PutMapping("/templates/{templateId}")
    @RequiresPermission(LETTER_TEMPLATE_MANAGE)
    public ResponseEntity<LetterTemplateResponse> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody LetterTemplateRequest request) {
        log.info("Updating letter template: {}", templateId);
        return ResponseEntity.ok(letterService.updateTemplate(templateId, request));
    }

    @GetMapping("/templates/{templateId}")
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<LetterTemplateResponse> getTemplateById(@PathVariable UUID templateId) {
        return ResponseEntity.ok(letterService.getTemplateById(templateId));
    }

    @GetMapping("/templates")
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<Page<LetterTemplateResponse>> getAllTemplates(Pageable pageable) {
        return ResponseEntity.ok(letterService.getAllTemplates(pageable));
    }

    @GetMapping("/templates/active")
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<List<LetterTemplateResponse>> getActiveTemplates() {
        return ResponseEntity.ok(letterService.getActiveTemplates());
    }

    @GetMapping("/templates/by-category")
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<List<LetterTemplateResponse>> getTemplatesByCategory(
            @RequestParam LetterCategory category) {
        return ResponseEntity.ok(letterService.getTemplatesByCategory(category));
    }

    @DeleteMapping("/templates/{templateId}")
    @RequiresPermission(LETTER_TEMPLATE_MANAGE)
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID templateId) {
        log.info("Deleting letter template: {}", templateId);
        letterService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Letter Generation Endpoints ====================

    @PostMapping("/generate")
    @RequiresPermission(LETTER_GENERATE)
    public ResponseEntity<GeneratedLetterResponse> generateLetter(
            @Valid @RequestBody GenerateLetterRequest request) {
        UUID generatedBy = SecurityContext.getCurrentEmployeeId();
        log.info("Generating letter for employee: {} by: {}", request.getEmployeeId(), generatedBy);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(letterService.generateLetter(request, generatedBy));
    }

    @PostMapping("/generate-offer")
    @RequiresPermission(RECRUITMENT_MANAGE)
    public ResponseEntity<GeneratedLetterResponse> generateOfferLetter(
            @Valid @RequestBody GenerateOfferLetterRequest request) {
        UUID generatedBy = SecurityContext.getCurrentEmployeeId();
        log.info("Generating offer letter for candidate: {} by: {}", request.getCandidateId(), generatedBy);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(letterService.generateOfferLetter(request, generatedBy));
    }

    @GetMapping("/{letterId}")
    @RequiresPermission({LETTER_TEMPLATE_VIEW, SELF_SERVICE_VIEW_LETTERS, LETTER_GENERATE})
    public ResponseEntity<GeneratedLetterResponse> getLetterById(@PathVariable UUID letterId) {
        return ResponseEntity.ok(letterService.getLetterById(letterId));
    }

    @GetMapping
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<Page<GeneratedLetterResponse>> getAllLetters(Pageable pageable) {
        return ResponseEntity.ok(letterService.getAllLetters(pageable));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({LETTER_TEMPLATE_VIEW, SELF_SERVICE_VIEW_LETTERS})
    public ResponseEntity<Page<GeneratedLetterResponse>> getLettersByEmployee(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        return ResponseEntity.ok(letterService.getLettersByEmployee(employeeId, pageable));
    }

    @GetMapping("/employee/{employeeId}/issued")
    @RequiresPermission(SELF_SERVICE_VIEW_LETTERS)
    public ResponseEntity<List<GeneratedLetterResponse>> getIssuedLettersForEmployee(
            @PathVariable UUID employeeId) {
        return ResponseEntity.ok(letterService.getIssuedLettersForEmployee(employeeId));
    }

    @GetMapping("/pending-approvals")
    @RequiresPermission(LETTER_APPROVE)
    public ResponseEntity<Page<GeneratedLetterResponse>> getPendingApprovals(Pageable pageable) {
        return ResponseEntity.ok(letterService.getPendingApprovals(pageable));
    }

    // ==================== Letter Workflow Endpoints ====================

    @PostMapping("/{letterId}/submit")
    @RequiresPermission(LETTER_GENERATE)
    public ResponseEntity<GeneratedLetterResponse> submitForApproval(@PathVariable UUID letterId) {
        log.info("Submitting letter for approval: {}", letterId);
        return ResponseEntity.ok(letterService.submitForApproval(letterId));
    }

    @PostMapping("/{letterId}/approve")
    @RequiresPermission(LETTER_APPROVE)
    public ResponseEntity<GeneratedLetterResponse> approveLetter(
            @PathVariable UUID letterId,
            @Size(max = 1000) @RequestParam(required = false) String comments) {
        UUID approverId = SecurityContext.getCurrentEmployeeId();
        log.info("Approving letter: {} by: {}", letterId, approverId);
        return ResponseEntity.ok(letterService.approveLetter(letterId, approverId, comments));
    }

    @PostMapping("/{letterId}/issue")
    @RequiresPermission(LETTER_ISSUE)
    public ResponseEntity<GeneratedLetterResponse> issueLetter(
            @PathVariable UUID letterId) {
        UUID issuerId = SecurityContext.getCurrentEmployeeId();
        log.info("Issuing letter: {} by: {}", letterId, issuerId);
        return ResponseEntity.ok(letterService.issueLetter(letterId, issuerId));
    }

    @PostMapping("/{letterId}/issue-with-esign")
    @RequiresPermission(RECRUITMENT_MANAGE)
    public ResponseEntity<GeneratedLetterResponse> issueOfferLetterWithESign(
            @PathVariable UUID letterId) {
        UUID issuerId = SecurityContext.getCurrentEmployeeId();
        log.info("Issuing offer letter with e-sign: {} by: {}", letterId, issuerId);
        return ResponseEntity.ok(letterService.issueOfferLetterWithESign(letterId, issuerId));
    }

    @PostMapping("/{letterId}/generate-pdf")
    @RequiresPermission({LETTER_GENERATE, RECRUITMENT_MANAGE})
    public ResponseEntity<GeneratePdfResponse> generatePdf(@PathVariable UUID letterId) {
        log.info("Generating PDF for letter: {}", letterId);
        String pdfUrl = letterPdfService.generatePdf(letterId);
        return ResponseEntity.ok(new GeneratePdfResponse(letterId, pdfUrl));
    }

    @PostMapping("/{letterId}/revoke")
    @RequiresPermission(LETTER_ISSUE)
    public ResponseEntity<GeneratedLetterResponse> revokeLetter(@PathVariable UUID letterId) {
        log.info("Revoking letter: {}", letterId);
        return ResponseEntity.ok(letterService.revokeLetter(letterId));
    }

    @PostMapping("/{letterId}/downloaded")
    @RequiresPermission(SELF_SERVICE_VIEW_LETTERS)
    public ResponseEntity<Void> markLetterDownloaded(
            @PathVariable UUID letterId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        letterService.markLetterDownloaded(letterId, employeeId);
        return ResponseEntity.ok().build();
    }

    // ==================== Template Clone & Preview ====================

    @PostMapping("/templates/{templateId}/clone")
    @RequiresPermission(LETTER_TEMPLATE_CREATE)
    public ResponseEntity<LetterTemplateResponse> cloneTemplate(@PathVariable UUID templateId) {
        log.info("Cloning letter template: {}", templateId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(letterService.cloneTemplate(templateId));
    }

    @GetMapping("/templates/{templateId}/preview")
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<String> previewTemplate(@PathVariable UUID templateId) {
        return ResponseEntity.ok(letterService.previewTemplate(templateId));
    }

    // ==================== Bulk Generation ====================

    @PostMapping("/bulk-generate")
    @RequiresPermission(LETTER_GENERATE)
    public ResponseEntity<List<GeneratedLetterResponse>> bulkGenerate(
            @RequestParam UUID templateId,
            @Valid @NotEmpty @RequestBody List<UUID> employeeIds) {
        UUID generatedBy = SecurityContext.getCurrentEmployeeId();
        log.info("Bulk generating letters for {} employees using template: {}", employeeIds.size(), templateId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(letterService.bulkGenerate(templateId, employeeIds, generatedBy));
    }

    // ==================== Reference Data Endpoints ====================

    @GetMapping("/categories")
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<LetterCategory[]> getLetterCategories() {
        return ResponseEntity.ok(letterService.getLetterCategories());
    }

    @GetMapping("/placeholders")
    @RequiresPermission(LETTER_TEMPLATE_VIEW)
    public ResponseEntity<Map<String, List<Map<String, String>>>> getAvailablePlaceholders() {
        return ResponseEntity.ok(letterService.getAvailablePlaceholders());
    }
}
