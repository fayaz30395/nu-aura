package com.hrms.api.lms.controller;

import com.hrms.api.lms.dto.*;
import com.hrms.application.lms.service.QuizAssessmentService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.lms.Certificate;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
// @PreAuthorize removed — @RequiresPermission handles auth + authorization via PermissionAspect
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lms/quizzes")
@RequiredArgsConstructor
@Tag(name = "LMS Quizzes", description = "Quiz assessment and attempt endpoints")
public class QuizController {

    private final QuizAssessmentService quizAssessmentService;

    /**
     * Get quiz details including questions (student view - no answers revealed)
     */
    @GetMapping("/{quizId}")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<QuizDetailResponse> getQuizDetails(@PathVariable UUID quizId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        QuizDetailResponse response = quizAssessmentService.getQuizDetails(quizId, tenantId);
        return ResponseEntity.ok(response);
    }

    /**
     * Start a new quiz attempt
     */
    @PostMapping("/{quizId}/start")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<QuizAttemptResponse> startQuizAttempt(@PathVariable UUID quizId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        QuizAttemptResponse response = quizAssessmentService.startQuizAttempt(quizId, employeeId, tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Submit quiz attempt and receive grading results
     */
    @PostMapping("/attempts/{attemptId}/submit")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<QuizResultResponse> submitQuizAttempt(
            @PathVariable UUID attemptId,
            @Valid @RequestBody QuizAttemptRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        QuizResultResponse response = quizAssessmentService.submitQuizAttempt(attemptId, request, tenantId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get attempt history for a quiz
     */
    @GetMapping("/{quizId}/attempts")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<List<QuizAttemptResponse>> getAttemptHistory(@PathVariable UUID quizId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        List<QuizAttemptResponse> attempts = quizAssessmentService.getAttemptHistory(quizId, employeeId, tenantId);
        return ResponseEntity.ok(attempts);
    }

    /**
     * Generate certificate after course completion
     */
    @PostMapping("/enrollments/{enrollmentId}/certificate")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<Certificate> generateCertificate(@PathVariable UUID enrollmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        Certificate certificate = quizAssessmentService.generateCertificate(enrollmentId, employeeId, tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(certificate);
    }
}
