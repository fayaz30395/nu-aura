package com.hrms.api.budget.controller;

import com.hrms.api.budget.dto.*;
import com.hrms.application.budget.service.BudgetPlanningService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/budget")
@RequiredArgsConstructor
@Tag(name = "Budget Planning", description = "Headcount budget and planning management APIs")
public class BudgetPlanningController {

    private final BudgetPlanningService budgetService;

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.BUDGET_VIEW)
    @Operation(summary = "Get budget dashboard", description = "Returns budget overview for a fiscal year")
    public ResponseEntity<BudgetDashboard> getDashboard(
            @RequestParam Integer fiscalYear) {
        return ResponseEntity.ok(budgetService.getDashboard(fiscalYear));
    }

    // ==================== BUDGET OPERATIONS ====================

    @PostMapping("/budgets")
    @RequiresPermission(Permission.BUDGET_CREATE)
    @Operation(summary = "Create headcount budget", description = "Creates a new headcount budget for a department")
    public ResponseEntity<HeadcountBudgetResponse> createBudget(
            @Valid @RequestBody HeadcountBudgetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(budgetService.createBudget(request));
    }

    @PutMapping("/budgets/{budgetId}")
    @RequiresPermission(Permission.BUDGET_MANAGE)
    @Operation(summary = "Update headcount budget", description = "Updates an existing headcount budget")
    public ResponseEntity<HeadcountBudgetResponse> updateBudget(
            @PathVariable UUID budgetId,
            @Valid @RequestBody HeadcountBudgetRequest request) {
        return ResponseEntity.ok(budgetService.updateBudget(budgetId, request));
    }

    @GetMapping("/budgets/{budgetId}")
    @RequiresPermission(Permission.BUDGET_VIEW)
    @Operation(summary = "Get budget details", description = "Returns detailed budget information with positions and scenarios")
    public ResponseEntity<HeadcountBudgetResponse> getBudget(@PathVariable UUID budgetId) {
        return ResponseEntity.ok(budgetService.getBudget(budgetId));
    }

    @GetMapping("/budgets")
    @RequiresPermission(Permission.BUDGET_VIEW)
    @Operation(summary = "Get all budgets", description = "Returns paginated list of all budgets")
    public ResponseEntity<Page<HeadcountBudgetResponse>> getAllBudgets(Pageable pageable) {
        return ResponseEntity.ok(budgetService.getAllBudgets(pageable));
    }

    @GetMapping("/budgets/fiscal-year/{year}")
    @RequiresPermission(Permission.BUDGET_VIEW)
    @Operation(summary = "Get budgets by fiscal year", description = "Returns all budgets for a specific fiscal year")
    public ResponseEntity<List<HeadcountBudgetResponse>> getBudgetsByFiscalYear(@PathVariable Integer year) {
        return ResponseEntity.ok(budgetService.getBudgetsByFiscalYear(year));
    }

    @GetMapping("/budgets/department/{departmentId}")
    @RequiresPermission(Permission.BUDGET_VIEW)
    @Operation(summary = "Get budgets by department", description = "Returns all budgets for a specific department")
    public ResponseEntity<List<HeadcountBudgetResponse>> getBudgetsByDepartment(@PathVariable UUID departmentId) {
        return ResponseEntity.ok(budgetService.getBudgetsByDepartment(departmentId));
    }

    @DeleteMapping("/budgets/{budgetId}")
    @RequiresPermission(Permission.BUDGET_MANAGE)
    @Operation(summary = "Delete budget", description = "Deletes a draft budget")
    public ResponseEntity<Void> deleteBudget(@PathVariable UUID budgetId) {
        budgetService.deleteBudget(budgetId);
        return ResponseEntity.noContent().build();
    }

    // ==================== BUDGET APPROVAL WORKFLOW ====================

    @PostMapping("/budgets/{budgetId}/submit")
    @RequiresPermission(Permission.BUDGET_MANAGE)
    @Operation(summary = "Submit budget for approval", description = "Submits a draft budget for approval")
    public ResponseEntity<HeadcountBudgetResponse> submitForApproval(@PathVariable UUID budgetId) {
        return ResponseEntity.ok(budgetService.submitForApproval(budgetId));
    }

    @PostMapping("/budgets/{budgetId}/approve")
    @RequiresPermission(Permission.BUDGET_APPROVE)
    @Operation(summary = "Approve budget", description = "Approves a pending budget")
    public ResponseEntity<HeadcountBudgetResponse> approveBudget(@PathVariable UUID budgetId) {
        return ResponseEntity.ok(budgetService.approveBudget(budgetId));
    }

    @PostMapping("/budgets/{budgetId}/reject")
    @RequiresPermission(Permission.BUDGET_APPROVE)
    @Operation(summary = "Reject budget", description = "Rejects a pending budget with reason")
    public ResponseEntity<HeadcountBudgetResponse> rejectBudget(
            @PathVariable UUID budgetId,
            @RequestParam String reason) {
        return ResponseEntity.ok(budgetService.rejectBudget(budgetId, reason));
    }

    // ==================== POSITION OPERATIONS ====================

    @PostMapping("/positions")
    @RequiresPermission(Permission.HEADCOUNT_MANAGE)
    @Operation(summary = "Create position", description = "Creates a new headcount position in a budget")
    public ResponseEntity<HeadcountPositionResponse> createPosition(
            @Valid @RequestBody HeadcountPositionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(budgetService.createPosition(request));
    }

    @PutMapping("/positions/{positionId}")
    @RequiresPermission(Permission.HEADCOUNT_MANAGE)
    @Operation(summary = "Update position", description = "Updates an existing headcount position")
    public ResponseEntity<HeadcountPositionResponse> updatePosition(
            @PathVariable UUID positionId,
            @Valid @RequestBody HeadcountPositionRequest request) {
        return ResponseEntity.ok(budgetService.updatePosition(positionId, request));
    }

    @PatchMapping("/positions/{positionId}/status")
    @RequiresPermission(Permission.HEADCOUNT_MANAGE)
    @Operation(summary = "Update position status", description = "Updates the status of a position")
    public ResponseEntity<HeadcountPositionResponse> updatePositionStatus(
            @PathVariable UUID positionId,
            @RequestParam String status) {
        return ResponseEntity.ok(budgetService.updatePositionStatus(positionId, status));
    }

    @GetMapping("/budgets/{budgetId}/positions")
    @RequiresPermission(Permission.HEADCOUNT_VIEW)
    @Operation(summary = "Get positions by budget", description = "Returns all positions for a specific budget")
    public ResponseEntity<List<HeadcountPositionResponse>> getPositionsByBudget(@PathVariable UUID budgetId) {
        return ResponseEntity.ok(budgetService.getPositionsByBudget(budgetId));
    }

    @GetMapping("/positions/status/{status}")
    @RequiresPermission(Permission.HEADCOUNT_VIEW)
    @Operation(summary = "Get positions by status", description = "Returns all positions with a specific status")
    public ResponseEntity<List<HeadcountPositionResponse>> getPositionsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(budgetService.getPositionsByStatus(status));
    }

    @DeleteMapping("/positions/{positionId}")
    @RequiresPermission(Permission.HEADCOUNT_MANAGE)
    @Operation(summary = "Delete position", description = "Deletes a headcount position")
    public ResponseEntity<Void> deletePosition(@PathVariable UUID positionId) {
        budgetService.deletePosition(positionId);
        return ResponseEntity.noContent().build();
    }

    // ==================== SCENARIO OPERATIONS ====================

    @PostMapping("/scenarios")
    @RequiresPermission(Permission.BUDGET_MANAGE)
    @Operation(summary = "Create scenario", description = "Creates a what-if scenario for budget planning")
    public ResponseEntity<BudgetScenarioResponse> createScenario(
            @Valid @RequestBody BudgetScenarioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(budgetService.createScenario(request));
    }

    @PutMapping("/scenarios/{scenarioId}")
    @RequiresPermission(Permission.BUDGET_MANAGE)
    @Operation(summary = "Update scenario", description = "Updates an existing budget scenario")
    public ResponseEntity<BudgetScenarioResponse> updateScenario(
            @PathVariable UUID scenarioId,
            @Valid @RequestBody BudgetScenarioRequest request) {
        return ResponseEntity.ok(budgetService.updateScenario(scenarioId, request));
    }

    @PostMapping("/scenarios/{scenarioId}/select")
    @RequiresPermission(Permission.BUDGET_MANAGE)
    @Operation(summary = "Select scenario", description = "Selects a scenario as the active planning scenario")
    public ResponseEntity<BudgetScenarioResponse> selectScenario(@PathVariable UUID scenarioId) {
        return ResponseEntity.ok(budgetService.selectScenario(scenarioId));
    }

    @GetMapping("/budgets/{budgetId}/scenarios")
    @RequiresPermission(Permission.BUDGET_VIEW)
    @Operation(summary = "Get scenarios by budget", description = "Returns all scenarios for a specific budget")
    public ResponseEntity<List<BudgetScenarioResponse>> getScenariosByBudget(@PathVariable UUID budgetId) {
        return ResponseEntity.ok(budgetService.getScenariosByBudget(budgetId));
    }

    @PostMapping("/scenarios/compare")
    @RequiresPermission(Permission.BUDGET_VIEW)
    @Operation(summary = "Compare scenarios", description = "Returns comparison data for multiple scenarios")
    public ResponseEntity<List<BudgetScenarioResponse>> compareScenarios(
            @RequestBody List<UUID> scenarioIds) {
        return ResponseEntity.ok(budgetService.compareScenarios(scenarioIds));
    }

    @DeleteMapping("/scenarios/{scenarioId}")
    @RequiresPermission(Permission.BUDGET_MANAGE)
    @Operation(summary = "Delete scenario", description = "Deletes a budget scenario")
    public ResponseEntity<Void> deleteScenario(@PathVariable UUID scenarioId) {
        budgetService.deleteScenario(scenarioId);
        return ResponseEntity.noContent().build();
    }
}
