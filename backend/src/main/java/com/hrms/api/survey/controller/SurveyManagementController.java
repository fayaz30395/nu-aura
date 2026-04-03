package com.hrms.api.survey.controller;

import com.hrms.api.survey.dto.SurveyRequest;
import com.hrms.api.survey.dto.SurveyDto;
import com.hrms.application.survey.service.SurveyManagementService;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.survey.Survey;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/survey-management")
@RequiredArgsConstructor
public class SurveyManagementController {

    private final SurveyManagementService surveyService;

    @PostMapping
    @RequiresPermission(SURVEY_CREATE)
    public ResponseEntity<SurveyDto> createSurvey(@Valid @RequestBody SurveyRequest request) {
        UUID createdBy = getCurrentUserId();
        SurveyDto response = surveyService.createSurvey(request, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{surveyId}")
    @RequiresPermission(SURVEY_UPDATE)
    public ResponseEntity<SurveyDto> updateSurvey(
            @PathVariable UUID surveyId,
            @Valid @RequestBody SurveyRequest request) {
        SurveyDto response = surveyService.updateSurvey(surveyId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{surveyId}/status")
    @RequiresPermission(SURVEY_MANAGE)
    public ResponseEntity<SurveyDto> updateStatus(
            @PathVariable UUID surveyId,
            @RequestParam Survey.SurveyStatus status) {
        SurveyDto response = surveyService.updateStatus(surveyId, status);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{surveyId}/launch")
    @RequiresPermission(SURVEY_MANAGE)
    public ResponseEntity<SurveyDto> launchSurvey(@PathVariable UUID surveyId) {
        SurveyDto response = surveyService.launchSurvey(surveyId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{surveyId}/complete")
    @RequiresPermission(SURVEY_MANAGE)
    public ResponseEntity<SurveyDto> completeSurvey(@PathVariable UUID surveyId) {
        SurveyDto response = surveyService.completeSurvey(surveyId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{surveyId}")
    @RequiresPermission(SURVEY_VIEW)
    public ResponseEntity<SurveyDto> getSurveyById(@PathVariable UUID surveyId) {
        SurveyDto response = surveyService.getSurveyById(surveyId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @RequiresPermission(SURVEY_VIEW)
    public ResponseEntity<Page<SurveyDto>> getAllSurveys(Pageable pageable) {
        Page<SurveyDto> response = surveyService.getAllSurveys(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @RequiresPermission(SURVEY_VIEW)
    public ResponseEntity<List<SurveyDto>> getSurveysByStatus(@PathVariable Survey.SurveyStatus status) {
        List<SurveyDto> response = surveyService.getSurveysByStatus(status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @RequiresPermission(SURVEY_VIEW)
    public ResponseEntity<List<SurveyDto>> getActiveSurveys() {
        List<SurveyDto> response = surveyService.getActiveSurveys();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{surveyId}")
    @RequiresPermission(SURVEY_DELETE)
    public ResponseEntity<Void> deleteSurvey(@PathVariable UUID surveyId) {
        surveyService.deleteSurvey(surveyId);
        return ResponseEntity.noContent().build();
    }

    private UUID getCurrentUserId() {
        return SecurityContext.getCurrentUserId();
    }
}
