package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.*;
import com.hrms.application.analytics.service.PredictiveAnalyticsService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/predictive-analytics")
@RequiredArgsConstructor
@Validated
@Tag(name = "Predictive Analytics", description = "AI-powered workforce analytics and predictions")
public class PredictiveAnalyticsController {

    private final PredictiveAnalyticsService analyticsService;

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get predictive analytics dashboard", description = "Returns comprehensive analytics dashboard with attrition predictions, workforce trends, and insights")
    public ResponseEntity<PredictiveAnalyticsDashboard> getDashboard() {
        return ResponseEntity.ok(analyticsService.getDashboard());
    }

    // ==================== ATTRITION PREDICTIONS ====================

    @GetMapping("/attrition/high-risk")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get high-risk employees", description = "Returns employees with attrition risk above specified threshold")
    public ResponseEntity<List<AttritionPredictionDto>> getHighRiskEmployees(
            @RequestParam(defaultValue = "70") BigDecimal minScore) {
        return ResponseEntity.ok(analyticsService.getHighRiskEmployees(minScore));
    }

    @GetMapping("/attrition/risk-level/{riskLevel}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get employees by risk level", description = "Returns employees filtered by risk level (LOW, MEDIUM, HIGH, CRITICAL)")
    public ResponseEntity<List<AttritionPredictionDto>> getByRiskLevel(@PathVariable String riskLevel) {
        return ResponseEntity.ok(analyticsService.getAttritionByRiskLevel(riskLevel));
    }

    @GetMapping("/attrition/employee/{employeeId}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get employee prediction history", description = "Returns historical attrition predictions for an employee")
    public ResponseEntity<List<AttritionPredictionDto>> getEmployeePredictions(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(analyticsService.getEmployeePredictionHistory(employeeId));
    }

    @PostMapping("/attrition/predict/{employeeId}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_MANAGE)
    @Operation(summary = "Run prediction for employee", description = "Triggers attrition prediction calculation for an employee")
    public ResponseEntity<AttritionPredictionDto> runPrediction(@PathVariable UUID employeeId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(analyticsService.runPredictionForEmployee(employeeId));
    }

    @PostMapping("/attrition/{predictionId}/action-taken")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_MANAGE)
    @Operation(summary = "Mark action taken", description = "Marks that retention action was taken for a prediction")
    public ResponseEntity<Void> markActionTaken(
            @PathVariable UUID predictionId,
            @Size(max = 1000) @RequestParam(required = false) String notes) {
        analyticsService.markActionTaken(predictionId, notes);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/attrition/{predictionId}/outcome")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_MANAGE)
    @Operation(summary = "Record actual outcome", description = "Records actual outcome for prediction accuracy tracking")
    public ResponseEntity<Void> recordOutcome(
            @PathVariable UUID predictionId,
            @RequestParam String outcome,
            @RequestParam(required = false) LocalDate leaveDate) {
        analyticsService.recordActualOutcome(predictionId, outcome, leaveDate);
        return ResponseEntity.ok().build();
    }

    // ==================== WORKFORCE TRENDS ====================

    @GetMapping("/trends/organization")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get organization trends", description = "Returns workforce trends for the entire organization")
    public ResponseEntity<List<WorkforceTrendDto>> getOrganizationTrends(@RequestParam Integer year) {
        return ResponseEntity.ok(analyticsService.getOrganizationTrends(year));
    }

    @GetMapping("/trends/department/{departmentId}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get department trends", description = "Returns workforce trends for a specific department")
    public ResponseEntity<List<WorkforceTrendDto>> getDepartmentTrends(
            @PathVariable UUID departmentId,
            @RequestParam Integer year) {
        return ResponseEntity.ok(analyticsService.getDepartmentTrends(departmentId, year));
    }

    @GetMapping("/trends/compare-departments")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Compare departments", description = "Returns comparison of all departments for a specific month")
    public ResponseEntity<List<WorkforceTrendDto>> compareDepartments(
            @RequestParam Integer year,
            @RequestParam Integer month) {
        return ResponseEntity.ok(analyticsService.compareDepartments(year, month));
    }

    @PostMapping("/trends/generate")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_MANAGE)
    @Operation(summary = "Generate trend data", description = "Generates workforce trend data for a specific period")
    public ResponseEntity<WorkforceTrendDto> generateTrend(
            @RequestParam Integer year,
            @RequestParam Integer month,
            @RequestParam(required = false) UUID departmentId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(analyticsService.generateTrend(year, month, departmentId));
    }

    // ==================== ANALYTICS INSIGHTS ====================

    @GetMapping("/insights")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get all insights", description = "Returns paginated list of analytics insights")
    public ResponseEntity<Page<AnalyticsInsightDto>> getAllInsights(Pageable pageable) {
        return ResponseEntity.ok(analyticsService.getAllInsights(pageable));
    }

    @GetMapping("/insights/category/{category}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get insights by category", description = "Returns insights filtered by category")
    public ResponseEntity<List<AnalyticsInsightDto>> getInsightsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(analyticsService.getInsightsByCategory(category));
    }

    @GetMapping("/insights/severity/{severity}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get insights by severity", description = "Returns insights filtered by severity (INFO, WARNING, CRITICAL)")
    public ResponseEntity<List<AnalyticsInsightDto>> getInsightsBySeverity(@PathVariable String severity) {
        return ResponseEntity.ok(analyticsService.getInsightsBySeverity(severity));
    }

    @PatchMapping("/insights/{insightId}/status")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_MANAGE)
    @Operation(summary = "Update insight status", description = "Updates the status of an insight")
    public ResponseEntity<AnalyticsInsightDto> updateInsightStatus(
            @PathVariable UUID insightId,
            @NotBlank @Size(max = 255) @RequestParam String status,
            @Size(max = 1000) @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(analyticsService.updateInsightStatus(insightId, status, notes));
    }

    @PostMapping("/insights/{insightId}/assign")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_MANAGE)
    @Operation(summary = "Assign insight", description = "Assigns an insight to a user for action")
    public ResponseEntity<AnalyticsInsightDto> assignInsight(
            @PathVariable UUID insightId,
            @RequestParam UUID assigneeId,
            @RequestParam(required = false) LocalDate dueDate) {
        return ResponseEntity.ok(analyticsService.assignInsight(insightId, assigneeId, dueDate));
    }

    @PostMapping("/insights")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_MANAGE)
    @Operation(summary = "Create insight", description = "Creates a manual analytics insight")
    public ResponseEntity<AnalyticsInsightDto> createInsight(
            @NotBlank @Size(max = 255) @RequestParam String title,
            @NotBlank @Size(max = 1000) @RequestParam String description,
            @NotBlank @Size(max = 255) @RequestParam String category,
            @NotBlank @Size(max = 255) @RequestParam String severity,
            @Size(max = 1000) @RequestParam(required = false) String recommendation) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(analyticsService.createInsight(title, description, category, severity, recommendation));
    }

    // ==================== SKILL GAPS ====================

    @GetMapping("/skill-gaps")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get latest skill gaps", description = "Returns the most recent skill gap analysis")
    public ResponseEntity<List<SkillGapDto>> getLatestSkillGaps() {
        return ResponseEntity.ok(analyticsService.getLatestSkillGaps());
    }

    @GetMapping("/skill-gaps/priority/{priority}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get skill gaps by priority", description = "Returns skill gaps filtered by priority level")
    public ResponseEntity<List<SkillGapDto>> getSkillGapsByPriority(@PathVariable String priority) {
        return ResponseEntity.ok(analyticsService.getSkillGapsByPriority(priority));
    }

    @GetMapping("/skill-gaps/department/{departmentId}")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get skill gaps by department", description = "Returns skill gaps for a specific department")
    public ResponseEntity<List<SkillGapDto>> getSkillGapsByDepartment(@PathVariable UUID departmentId) {
        return ResponseEntity.ok(analyticsService.getSkillGapsByDepartment(departmentId));
    }

    @GetMapping("/skill-gaps/trainable")
    @RequiresPermission(Permission.PREDICTIVE_ANALYTICS_VIEW)
    @Operation(summary = "Get trainable high-priority gaps", description = "Returns high-priority skill gaps that can be addressed through training")
    public ResponseEntity<List<SkillGapDto>> getTrainableGaps() {
        return ResponseEntity.ok(analyticsService.getTrainableHighPriorityGaps());
    }
}
