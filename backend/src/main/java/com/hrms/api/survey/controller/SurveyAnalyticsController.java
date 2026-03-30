package com.hrms.api.survey.controller;

import com.hrms.api.survey.dto.*;
import com.hrms.application.survey.service.SurveyAnalyticsService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.survey.SurveyInsight;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/survey-analytics")
@RequiredArgsConstructor
@Validated
@Tag(name = "Survey Analytics", description = "Advanced survey analytics, sentiment analysis, and engagement scoring")
public class SurveyAnalyticsController {

    private final SurveyAnalyticsService analyticsService;

    // ==================== Question Management ====================

    @PostMapping("/surveys/{surveyId}/questions")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    @Operation(summary = "Add question to survey")
    public ResponseEntity<QuestionResponse> addQuestion(
            @PathVariable UUID surveyId,
            @Valid @RequestBody QuestionRequest request) {
        log.info("Adding question to survey {}", surveyId);
        return ResponseEntity.ok(analyticsService.addQuestion(surveyId, request));
    }

    @GetMapping("/surveys/{surveyId}/questions")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get all questions for a survey")
    public ResponseEntity<List<QuestionResponse>> getQuestions(@PathVariable UUID surveyId) {
        return ResponseEntity.ok(analyticsService.getQuestions(surveyId));
    }

    // ==================== Response Submission ====================

    @PostMapping("/responses/submit")
    @RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)
    @Operation(summary = "Submit survey response with answers")
    public ResponseEntity<SurveyResponseDetailDto> submitResponse(
            @Valid @RequestBody SubmitResponseRequest request) {
        log.info("Submitting response for survey {}", request.getSurveyId());
        return ResponseEntity.ok(analyticsService.submitResponse(request));
    }

    // ==================== Engagement Scoring ====================

    @PostMapping("/surveys/{surveyId}/calculate-engagement")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    @Operation(summary = "Calculate and save engagement score for a survey")
    public ResponseEntity<EngagementScoreDto> calculateEngagementScore(@PathVariable UUID surveyId) {
        log.info("Calculating engagement score for survey {}", surveyId);
        return ResponseEntity.ok(analyticsService.calculateEngagementScore(surveyId));
    }

    @GetMapping("/engagement/latest")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get latest organization-level engagement score")
    public ResponseEntity<EngagementScoreDto> getLatestEngagementScore() {
        EngagementScoreDto score = analyticsService.getLatestEngagementScore();
        if (score == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(score);
    }

    @GetMapping("/engagement/trend")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get engagement score trend over time")
    public ResponseEntity<List<EngagementScoreDto>> getEngagementTrend(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(analyticsService.getEngagementTrend(startDate, endDate));
    }

    @GetMapping("/surveys/{surveyId}/department-scores")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get department-level engagement scores for a survey")
    public ResponseEntity<List<EngagementScoreDto>> getDepartmentScores(@PathVariable UUID surveyId) {
        return ResponseEntity.ok(analyticsService.getDepartmentScores(surveyId));
    }

    // ==================== Insight Generation ====================

    @PostMapping("/surveys/{surveyId}/generate-insights")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    @Operation(summary = "Generate AI-powered insights from survey data")
    public ResponseEntity<List<SurveyInsightDto>> generateInsights(@PathVariable UUID surveyId) {
        log.info("Generating insights for survey {}", surveyId);
        return ResponseEntity.ok(analyticsService.generateInsights(surveyId));
    }

    @GetMapping("/surveys/{surveyId}/insights")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get all insights for a survey")
    public ResponseEntity<List<SurveyInsightDto>> getInsights(@PathVariable UUID surveyId) {
        return ResponseEntity.ok(analyticsService.getInsights(surveyId));
    }

    @GetMapping("/insights/high-priority")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get high priority unacknowledged insights")
    public ResponseEntity<List<SurveyInsightDto>> getHighPriorityInsights() {
        return ResponseEntity.ok(analyticsService.getHighPriorityInsights());
    }

    @PostMapping("/insights/{insightId}/acknowledge")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    @Operation(summary = "Acknowledge an insight")
    public ResponseEntity<SurveyInsightDto> acknowledgeInsight(@PathVariable UUID insightId) {
        UUID userId = SecurityContext.getCurrentUserId();
        return ResponseEntity.ok(analyticsService.acknowledgeInsight(insightId, userId));
    }

    @PutMapping("/insights/{insightId}/action")
    @RequiresPermission(Permission.SURVEY_MANAGE)
    @Operation(summary = "Update insight action status")
    public ResponseEntity<SurveyInsightDto> updateInsightAction(
            @PathVariable UUID insightId,
            @RequestParam SurveyInsight.ActionStatus status,
            @RequestParam(required = false) UUID assignedTo,
            @Size(max = 1000) @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(analyticsService.updateInsightAction(insightId, status, assignedTo, notes));
    }

    // ==================== Analytics Summary ====================

    @GetMapping("/surveys/{surveyId}/summary")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get comprehensive analytics summary for a survey")
    public ResponseEntity<SurveyAnalyticsSummary> getSurveyAnalytics(@PathVariable UUID surveyId) {
        log.info("Getting analytics summary for survey {}", surveyId);
        return ResponseEntity.ok(analyticsService.getSurveyAnalytics(surveyId));
    }

    // ==================== Dashboard Endpoints ====================

    @GetMapping("/dashboard/engagement-overview")
    @RequiresPermission(Permission.SURVEY_VIEW)
    @Operation(summary = "Get engagement overview for dashboard")
    public ResponseEntity<EngagementOverview> getEngagementOverview() {
        EngagementScoreDto latest = analyticsService.getLatestEngagementScore();
        List<SurveyInsightDto> topInsights = analyticsService.getHighPriorityInsights();

        EngagementOverview overview = EngagementOverview.builder()
                .currentScore(latest != null ? latest.getOverallScore() : null)
                .previousScore(latest != null ? latest.getPreviousScore() : null)
                .trend(latest != null ? latest.getScoreDelta() : null)
                .engagementLevel(latest != null ? latest.getEngagementLevel() : "No Data")
                .npsScore(latest != null ? latest.getNpsScore() : null)
                .responseRate(latest != null ? latest.getResponseRate() : null)
                .totalResponses(latest != null ? latest.getTotalResponses() : 0)
                .topInsights(topInsights.stream().limit(3).toList())
                .categoryScores(latest != null ? latest.getCategoryScores() : null)
                .build();

        return ResponseEntity.ok(overview);
    }

    @lombok.Getter
    @lombok.Setter
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    @lombok.Builder
    public static class EngagementOverview {
        private Double currentScore;
        private Double previousScore;
        private Double trend;
        private String engagementLevel;
        private Double npsScore;
        private Double responseRate;
        private Integer totalResponses;
        private List<SurveyInsightDto> topInsights;
        private Map<String, Double> categoryScores;
    }
}
