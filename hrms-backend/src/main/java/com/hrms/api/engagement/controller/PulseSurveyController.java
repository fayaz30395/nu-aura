package com.hrms.api.engagement.controller;

import com.hrms.api.engagement.dto.PulseSurveyRequest;
import com.hrms.api.engagement.dto.PulseSurveyResponse;
import com.hrms.api.engagement.dto.SurveySubmissionRequest;
import com.hrms.application.engagement.service.PulseSurveyService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.engagement.PulseSurvey;
import com.hrms.domain.engagement.PulseSurvey.SurveyStatus;
import com.hrms.domain.engagement.PulseSurveyQuestion;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/surveys")
@RequiredArgsConstructor
public class PulseSurveyController {

    private final PulseSurveyService surveyService;

    // ==================== Survey CRUD ====================

    @PostMapping
    @RequiresPermission(Permission.SURVEY_MANAGE)
    public ResponseEntity<PulseSurveyResponse> createSurvey(
            @Valid @RequestBody PulseSurveyRequest request) {
        PulseSurvey survey = surveyService.createSurvey(request);
        return ResponseEntity.created(URI.create("/api/v1/surveys/" + survey.getId()))
                .body(PulseSurveyResponse.fromEntity(survey));
    }

    @PutMapping("/{surveyId}")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    public ResponseEntity<PulseSurveyResponse> updateSurvey(
            @PathVariable UUID surveyId,
            @Valid @RequestBody PulseSurveyRequest request) {
        PulseSurvey survey = surveyService.updateSurvey(surveyId, request);
        return ResponseEntity.ok(PulseSurveyResponse.fromEntity(survey));
    }

    @GetMapping("/{surveyId}")
    @RequiresPermission(Permission.SURVEY_VIEW)
    public ResponseEntity<PulseSurveyResponse> getSurvey(@PathVariable UUID surveyId) {
        return surveyService.getSurveyById(surveyId)
                .map(survey -> {
                    PulseSurveyResponse response = PulseSurveyResponse.fromEntity(survey);
                    List<PulseSurveyQuestion> questions = surveyService.getSurveyQuestions(surveyId);
                    response.setQuestions(questions.stream()
                            .map(this::toQuestionResponse)
                            .collect(Collectors.toList()));
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @RequiresPermission(Permission.SURVEY_VIEW)
    public ResponseEntity<Page<PulseSurveyResponse>> getAllSurveys(
            @RequestParam(required = false) SurveyStatus status,
            Pageable pageable) {
        Page<PulseSurvey> surveys = status != null
                ? surveyService.getSurveysByStatus(status, pageable)
                : surveyService.getAllSurveys(pageable);

        return ResponseEntity.ok(surveys.map(PulseSurveyResponse::fromEntity));
    }

    @GetMapping("/active")
    @RequiresPermission(Permission.SURVEY_VIEW)
    public ResponseEntity<List<PulseSurveyResponse>> getActiveSurveys() {
        List<PulseSurvey> surveys = surveyService.getActiveSurveys();
        return ResponseEntity.ok(surveys.stream()
                .map(PulseSurveyResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @DeleteMapping("/{surveyId}")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    public ResponseEntity<Void> deleteSurvey(@PathVariable UUID surveyId) {
        surveyService.deleteSurvey(surveyId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Survey Lifecycle ====================

    @PostMapping("/{surveyId}/publish")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    public ResponseEntity<PulseSurveyResponse> publishSurvey(@PathVariable UUID surveyId) {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        PulseSurvey survey = surveyService.publishSurvey(surveyId, userId);
        return ResponseEntity.ok(PulseSurveyResponse.fromEntity(survey));
    }

    @PostMapping("/{surveyId}/close")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    public ResponseEntity<PulseSurveyResponse> closeSurvey(@PathVariable UUID surveyId) {
        UUID userId = SecurityContext.getCurrentEmployeeId();
        PulseSurvey survey = surveyService.closeSurvey(surveyId, userId);
        return ResponseEntity.ok(PulseSurveyResponse.fromEntity(survey));
    }

    // ==================== Question Management ====================

    @PostMapping("/{surveyId}/questions")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    public ResponseEntity<PulseSurveyResponse.QuestionResponse> addQuestion(
            @PathVariable UUID surveyId,
            @Valid @RequestBody PulseSurveyRequest.QuestionRequest request) {
        PulseSurveyQuestion question = surveyService.addQuestion(surveyId, request);
        return ResponseEntity.created(URI.create("/api/v1/surveys/" + surveyId + "/questions/" + question.getId()))
                .body(toQuestionResponse(question));
    }

    @GetMapping("/{surveyId}/questions")
    @RequiresPermission(Permission.SURVEY_VIEW)
    public ResponseEntity<List<PulseSurveyResponse.QuestionResponse>> getSurveyQuestions(
            @PathVariable UUID surveyId) {
        List<PulseSurveyQuestion> questions = surveyService.getSurveyQuestions(surveyId);
        return ResponseEntity.ok(questions.stream()
                .map(this::toQuestionResponse)
                .collect(Collectors.toList()));
    }

    @DeleteMapping("/{surveyId}/questions/{questionId}")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable UUID surveyId,
            @PathVariable UUID questionId) {
        surveyService.deleteQuestion(surveyId, questionId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Survey Response (Employee) ====================

    @PostMapping("/{surveyId}/start")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Map<String, Object>> startSurvey(@PathVariable UUID surveyId) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        com.hrms.domain.engagement.PulseSurveyResponse response =
                surveyService.startSurveyResponse(surveyId, employeeId);

        List<PulseSurveyQuestion> questions = surveyService.getSurveyQuestions(surveyId);

        return ResponseEntity.ok(Map.of(
                "responseId", response.getId(),
                "surveyId", surveyId,
                "questions", questions.stream().map(this::toQuestionResponse).collect(Collectors.toList())
        ));
    }

    @PostMapping("/submit")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Map<String, Object>> submitSurvey(
            @Valid @RequestBody SurveySubmissionRequest request,
            HttpServletRequest httpRequest) {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        String ipAddress = httpRequest.getRemoteAddr();

        com.hrms.domain.engagement.PulseSurveyResponse response =
                surveyService.submitSurveyResponse(request, employeeId, ipAddress);

        return ResponseEntity.ok(Map.of(
                "responseId", response.getId(),
                "status", response.getStatus(),
                "submittedAt", response.getSubmittedAt()
        ));
    }

    // ==================== Analytics ====================

    @GetMapping("/{surveyId}/analytics")
    @RequiresPermission(Permission.SURVEY_VIEW)
    public ResponseEntity<Map<String, Object>> getSurveyAnalytics(@PathVariable UUID surveyId) {
        return ResponseEntity.ok(surveyService.getSurveyAnalytics(surveyId));
    }

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.SURVEY_VIEW)
    public ResponseEntity<Map<String, Object>> getEngagementDashboard() {
        return ResponseEntity.ok(surveyService.getEngagementDashboard());
    }

    // ==================== Helpers ====================

    private PulseSurveyResponse.QuestionResponse toQuestionResponse(PulseSurveyQuestion question) {
        return PulseSurveyResponse.QuestionResponse.builder()
                .id(question.getId())
                .questionText(question.getQuestionText())
                .questionType(question.getQuestionType())
                .questionOrder(question.getQuestionOrder())
                .isRequired(question.getIsRequired())
                .minValue(question.getMinValue())
                .maxValue(question.getMaxValue())
                .minLabel(question.getMinLabel())
                .maxLabel(question.getMaxLabel())
                .category(question.getCategory())
                .helpText(question.getHelpText())
                .build();
    }
}
